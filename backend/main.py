from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import pandas as pd
import io
import json
import re
from datetime import datetime
from PyPDF2 import PdfReader
import openpyxl
import xlrd
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from PIL import Image as PILImage
import os
import secrets

from services.analysis_service import AnalysisService
from services.scoring_service import ScoringService
from services.history_service import HistoryService
from services.nlg_service import NLGService
from services.auth_service import AuthService
from services.bias_detection import BiasDetectionService
from services.audit_service import AuditService
from services.contract_service import ContractService

# Initialize FastAPI app
app = FastAPI(title="OpenAudit API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
analysis_service = AnalysisService()
scoring_service = ScoringService()
history_service = HistoryService()
nlg_service = NLGService()
auth_service = AuthService()
bias_detection_service = BiasDetectionService()
audit_service = AuditService()
contract_service = ContractService()


def find_column(df: pd.DataFrame, possible_names: List[str]) -> Optional[str]:
    """Find a column by trying multiple possible names"""
    df_columns_lower = [col.lower().strip() for col in df.columns]
    for name in possible_names:
        name_lower = name.lower().strip()
        if name_lower in df_columns_lower:
            # Return the actual column name from the dataframe
            for col in df.columns:
                if col.lower().strip() == name_lower:
                    return col
    return None


def check_missing_values(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
    """
    Check for missing values in CSV/Excel files and return detailed information.
    This is a separate case that doesn't affect the rest of the code.
    Returns a dictionary with missing value details for table display.
    """
    missing_data = []
    
    try:
        # Get column names and indices
        columns = list(df.columns)
        
        # Check each column for missing values
        for col_idx, col_name in enumerate(columns):
            # Find rows with missing values (NaN or None)
            missing_mask = df[col_name].isnull()
            missing_rows = df[missing_mask].index.tolist()
            
            # Find rows with empty strings
            empty_mask = df[col_name].astype(str).str.strip() == ''
            empty_rows = df[empty_mask].index.tolist()
            
            # Combine missing and empty rows (convert to 1-indexed for user display)
            all_missing_rows = sorted(set([int(r) + 1 for r in missing_rows + empty_rows]))
            
            if len(all_missing_rows) > 0:
                col_number = col_idx + 1
                missing_data.append({
                    'filename': filename,
                    'column_number': col_number,
                    'column_name': str(col_name),
                    'missing_rows': all_missing_rows,
                    'missing_count': len(all_missing_rows)
                })
    except Exception as e:
        # Don't break processing if missing value check fails
        print(f"[WARNING] Error checking missing values in {filename}: {str(e)}")
        pass
    
    return missing_data


def normalize_transactions(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Normalize dataframe columns to standard format and convert to transactions"""
    df = df.copy()
    df.columns = df.columns.str.strip()  # Remove whitespace
    
    # Find amount column with flexible matching - prioritize debit for expenses
    debit_col = find_column(df, ['debit', 'debits', 'dr', 'withdrawal'])
    credit_col = find_column(df, ['credit', 'credits', 'cr', 'deposit'])
    
    # For spending analysis, prefer debit column (money going out = expenses)
    # If debit column exists, use it; otherwise try general amount columns
    if debit_col:
        amount_col = debit_col
    else:
        amount_col = find_column(df, [
            'amount', 'amt', 'value', 'price', 'cost', 'total', 'sum', 
            'transaction_amount', 'amount_rs', 'rupees', 'inr', '₹', 'rs'
        ])
    
    # Find description column with flexible matching
    desc_col = find_column(df, [
        'description', 'desc', 'details', 'particulars', 'narration', 
        'transaction_description', 'memo', 'note', 'remarks', 'info', 
        'transaction_type', 'type', 'category'
    ])
    
    # Find date column with flexible matching
    date_col = find_column(df, [
        'date', 'transaction_date', 'date_time', 'datetime', 'timestamp', 
        'trans_date', 'value_date', 'posting_date', 'time'
    ])
    
    transactions = []
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    # Process each row
    for idx, row in df.iterrows():
        transaction = {}
        
        # Extract amount - handle Debit/Credit columns specially
        amount = None
        
        # If we have a debit column, ONLY use it for expenses
        # Skip rows where debit is "-" (those are credit transactions)
        if debit_col:
            try:
                val = row[debit_col]
                if pd.notna(val):
                    val_str = str(val).strip()
                    # Handle "-" or empty values in debit column - these are credits, skip them
                    if val_str and val_str not in ['-', '', 'None', 'nan', 'NaN']:
                        # Remove currency symbols and commas
                        clean_val = val_str.replace(',', '').replace('₹', '').replace('Rs', '').replace('RS', '').strip()
                        if clean_val:
                            try:
                                amount = float(clean_val)
                                # Only accept positive amounts for debit
                                if amount > 0:
                                    amount = abs(amount)  # Ensure positive
                                else:
                                    amount = None  # Skip zero/negative in debit column
                            except (ValueError, TypeError):
                                amount = None
                    else:
                        # Debit is "-" or empty, this is a credit transaction - SKIP IT
                        continue  # Skip this row entirely - it's not an expense
            except (ValueError, TypeError, KeyError):
                # If we have debit column but can't read it, skip this row
                continue
        
        # If no debit amount found, try the general amount column
        if amount is None or amount == 0:
            if amount_col and amount_col != debit_col:
                try:
                    val = row[amount_col]
                    if pd.notna(val):
                        val_str = str(val).strip()
                        if val_str and val_str not in ['-', '', 'None', 'nan', 'NaN']:
                            clean_val = val_str.replace(',', '').replace('₹', '').replace('Rs', '').replace('RS', '').strip()
                            if clean_val:
                                try:
                                    amount = abs(float(clean_val))  # Use absolute value
                                except (ValueError, TypeError):
                                    pass
                except (ValueError, TypeError, KeyError):
                    pass
        
        # If no amount column found, try to extract from any numeric column
        # BUT skip columns we've already tried (debit_col, amount_col, date_col, desc_col)
        if amount is None:
            skipped_cols = {debit_col, amount_col, date_col, desc_col}
            for col in df.columns:
                if col in skipped_cols:
                    continue
                try:
                    val = row[col]
                    if pd.notna(val):
                        val_str = str(val).strip()
                        if val_str and val_str not in ['-', '', 'None', 'nan', 'NaN']:
                            clean_val = val_str.replace(',', '').replace('₹', '').replace('Rs', '').replace('RS', '').strip()
                            if clean_val:
                                try:
                                    num_val = abs(float(clean_val))
                                    # If it's a reasonable amount (not a date, ID, etc.)
                                    # Skip balance column (usually very large numbers)
                                    if 0.01 <= num_val <= 999999999 and col.lower() not in ['balance', 'bal']:
                                        amount = num_val
                                        break
                                except (ValueError, TypeError):
                                    continue
                except (ValueError, TypeError, KeyError):
                    continue
        
        # If still no amount, use 0 as default
        if amount is None:
            amount = 0.0
        
        # Extract description
        description = ""
        if desc_col:
            desc_val = row[desc_col]
            if pd.notna(desc_val):
                description = str(desc_val).strip()
        
        # If no description column, try to create from other columns
        if not description:
            other_cols = []
            for col in df.columns:
                if col not in [amount_col, date_col]:
                    val = row[col]
                    if pd.notna(val):
                        other_cols.append(str(val).strip())
            description = " | ".join(other_cols[:3])  # Use first 3 non-numeric columns
        
        # If still no description, use default
        if not description:
            description = f"Transaction {idx + 1}"
        
        # Extract date
        if date_col:
            try:
                date_val = row[date_col]
                if pd.notna(date_val):
                    # Try to parse date
                    if isinstance(date_val, str):
                        # Try common date formats
                        for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%y', '%m-%d-%Y']:
                            try:
                                parsed_date = datetime.strptime(date_val.strip(), fmt)
                                transaction['date'] = parsed_date.strftime('%Y-%m-%d')
                                break
                            except:
                                continue
                    else:
                        # Already a date/datetime object
                        if hasattr(date_val, 'strftime'):
                            transaction['date'] = date_val.strftime('%Y-%m-%d')
                        else:
                            transaction['date'] = str(date_val)[:10]  # First 10 chars
            except:
                pass
        
        # Use current date if no date found
        if 'date' not in transaction:
            transaction['date'] = current_date
        
        # Ensure amount is set (use 0 if None)
        if amount is None:
            amount = 0.0
        else:
            amount = abs(float(amount))  # Ensure positive and numeric
        
        # Only add if we have a valid amount (> 0) OR a description (even with 0 amount)
        # For spending analysis, prioritize transactions with amounts > 0
        if amount > 0 or description:
            transaction['amount'] = float(amount)
            transaction['description'] = description
            transactions.append(transaction)
    
    return transactions


def process_file(file: UploadFile) -> Dict[str, Any]:
    """Process a single file and extract data - flexible and handles any format"""
    filename = file.filename
    file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
    file_errors = []
    file_warnings = []
    transactions = []
    missing_values_data = []  # Store detailed missing value information
    
    try:
        content = file.file.read()
        file.file.seek(0)  # Reset file pointer
        
        df = None
        
        if file_ext in ['csv']:
            try:
                # Try reading with different encodings
                encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
                for encoding in encodings:
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                        break
                    except:
                        continue
                
                if df is None:
                    df = pd.read_csv(io.BytesIO(content))  # Default encoding
                
                # Check for missing values in CSV (separate case - doesn't affect processing)
                if df is not None and not df.empty:
                    missing_value_data = check_missing_values(df, filename)
                    missing_values_data.extend(missing_value_data)
                    # Add summary warnings for compatibility
                    for missing_info in missing_value_data:
                        file_warnings.append(
                            f"⚠️ Missing value detected in {missing_info['filename']}: Column {missing_info['column_number']} ({missing_info['column_name']}) has {missing_info['missing_count']} missing value(s)"
                        )
            except Exception as e:
                file_errors.append(f"Failed to parse CSV: {str(e)}")
                df = None
                
        elif file_ext in ['xlsx', 'xls']:
            try:
                if file_ext == 'xlsx':
                    df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
                else:
                    df = pd.read_excel(io.BytesIO(content), engine='xlrd')
                
                # Check for missing values in Excel (separate case - doesn't affect processing)
                if df is not None and not df.empty:
                    missing_value_data = check_missing_values(df, filename)
                    missing_values_data.extend(missing_value_data)
                    # Add summary warnings for compatibility
                    for missing_info in missing_value_data:
                        file_warnings.append(
                            f"⚠️ Missing value detected in {missing_info['filename']}: Column {missing_info['column_number']} ({missing_info['column_name']}) has {missing_info['missing_count']} missing value(s)"
                        )
            except Exception as e:
                file_errors.append(f"Failed to parse Excel file: {str(e)}")
                df = None
                
        
        # Process dataframe if we have one
        if df is not None and not df.empty:
            # DEBUG: Log what columns we have
            print(f"[FILE DEBUG] File: {filename}, Columns: {list(df.columns)}")
            print(f"[FILE DEBUG] DataFrame shape: {df.shape}, First row sample: {df.iloc[0].to_dict() if len(df) > 0 else 'None'}")
            
            try:
                # Normalize and convert to transactions
                transactions = normalize_transactions(df)
                
                # DEBUG: Log what transactions we extracted
                if transactions:
                    total_extracted = sum(t.get('amount', 0) for t in transactions)
                    non_zero_extracted = len([t for t in transactions if t.get('amount', 0) > 0])
                    print(f"[FILE DEBUG] Extracted {len(transactions)} transactions, total={total_extracted}, non-zero={non_zero_extracted}")
                    print(f"[FILE DEBUG] Sample extracted transaction: {transactions[0] if transactions else 'None'}")
                
                if not transactions:
                    file_warnings.append("File processed but no transaction data could be extracted. Please check your file format.")
                    # Create at least one transaction from the file
                    transactions = [{
                        'amount': 0.0,
                        'description': f"Data from {filename}",
                        'date': datetime.now().strftime('%Y-%m-%d')
                    }]
            except Exception as e:
                file_warnings.append(f"Error normalizing data: {str(e)}")
                # Try to create basic transactions from raw data
                try:
                    for idx, row in df.iterrows():
                        transactions.append({
                            'amount': float(idx) if pd.notna(idx) else 0.0,
                            'description': f"Row {idx + 1}",
                            'date': datetime.now().strftime('%Y-%m-%d')
                        })
                except:
                    transactions = [{
                        'amount': 0.0,
                        'description': f"Data from {filename}",
                        'date': datetime.now().strftime('%Y-%m-%d')
                    }]
        
        elif file_ext == 'pdf':
            try:
                pdf_reader = PdfReader(io.BytesIO(content))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                
                if not text.strip():
                    file_warnings.append("PDF contains no extractable text. May need OCR.")
                    transactions = [{
                        'amount': 0.0,
                        'description': f"PDF file: {filename} (no extractable text)",
                        'date': datetime.now().strftime('%Y-%m-%d')
                    }]
                else:
                    # Try to extract structured data from PDF text
                    # First, try to parse as a table (for bank statements with columns)
                    lines = text.split('\n')
                    extracted_transactions = []
                    
                    # Look for table-like structure with Date, Details, Debit, Credit, Balance
                    # Try to identify header row
                    header_row_idx = -1
                    for i, line in enumerate(lines):
                        line_lower = line.lower()
                        if ('date' in line_lower and 'debit' in line_lower) or ('date' in line_lower and 'details' in line_lower):
                            header_row_idx = i
                            break
                    
                    if header_row_idx >= 0:
                        # Parse as table - look for lines with date patterns followed by details and amounts
                        for i in range(header_row_idx + 1, len(lines)):
                            line = lines[i].strip()
                            if not line or len(line) < 10:
                                continue
                            
                            # Try to extract date (patterns like "31 OCT 2025" or "31-10-2025")
                            date_match = re.search(r'(\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})', line, re.IGNORECASE)
                            if not date_match:
                                date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', line)
                            
                            if date_match:
                                date_str = date_match.group(1)
                                try:
                                    # Parse date
                                    date_obj = None
                                    try:
                                        date_obj = datetime.strptime(date_str, '%d %b %Y')
                                    except:
                                        try:
                                            date_obj = datetime.strptime(date_str, '%d-%m-%Y')
                                        except:
                                            try:
                                                date_obj = datetime.strptime(date_str, '%d/%m/%Y')
                                            except:
                                                pass
                                    date_val = date_obj.strftime('%Y-%m-%d') if date_obj else datetime.now().strftime('%Y-%m-%d')
                                except:
                                    date_val = datetime.now().strftime('%Y-%m-%d')
                                
                                # Check if this is a debit transaction (TRANSFER TO) or credit (TRANSFER FROM)
                                line_upper = line.upper()
                                is_debit = 'TRANSFER TO' in line_upper or 'DR' in line_upper
                                is_credit = 'TRANSFER FROM' in line_upper or 'CR' in line_upper
                                
                                # For spending analysis, only process debit transactions
                                if is_credit:
                                    continue  # Skip credit transactions
                                
                                # Extract all amounts with 2 decimal places (typical format: 100.00, 2,000.00)
                                amount_patterns = re.findall(r'([\d,]+\.\d{2})', line)
                                
                                debit_amount = None
                                if amount_patterns:
                                    # Bank statement structure: Date | Details | Ref No | Debit | Credit | Balance
                                    # For debit transactions, we want the Debit column value
                                    # Strategy: Find amounts after the details but before balance (usually the last amount)
                                    
                                    # Look for amounts that are reasonable expense values
                                    # Usually debit comes after details, balance is usually last
                                    date_end = date_match.end()
                                    
                                    # Find position of details end (look for end of transaction description)
                                    # Details usually end before amounts start
                                    for amt_str in amount_patterns:
                                        amt_pos = line.find(amt_str)
                                        # Amount should be after date and some description text
                                        if amt_pos > date_end + 30:  # After date and reasonable description
                                            try:
                                                amt = float(amt_str.replace(',', ''))
                                                # Check if it's a reasonable expense amount (not balance which could be very large)
                                                # Debit amounts are usually smaller than balance
                                                if 0.01 <= amt <= 10000000:  # Reasonable expense range
                                                    # If this is a debit transaction, this amount is likely the debit
                                                    if is_debit:
                                                        debit_amount = amt
                                                        break
                                                    # If we don't know transaction type, take first reasonable amount
                                                    elif debit_amount is None:
                                                        debit_amount = amt
                                            except:
                                                pass
                                
                                # Extract description (between date and first amount)
                                description = ""
                                if date_match:
                                    desc_start = date_match.end()
                                    desc_end = len(line)
                                    # Find where amounts start
                                    for amt_str in amount_patterns:
                                        amt_pos = line.find(amt_str)
                                        if amt_pos > desc_start:
                                            desc_end = amt_pos
                                            break
                                    description = line[desc_start:desc_end].strip()
                                
                                # Use debit amount for expense (only process if we have a debit amount)
                                if debit_amount and debit_amount > 0:
                                    extracted_transactions.append({
                                        'amount': debit_amount,
                                        'description': description or 'Transaction',
                                        'date': date_val
                                    })
                    
                    # If no table structure found, fall back to simple line-by-line extraction
                    if not extracted_transactions:
                        for line in lines:
                            line = line.strip()
                            if line and len(line) > 5:  # Skip very short lines
                                # Try to extract amount (look for numbers)
                                amounts = re.findall(r'([\d,]+\.\d{2}|[\d,]+\.[\d]{1,2})', line)
                                if amounts:
                                    try:
                                        amount = float(amounts[-1].replace(',', ''))
                                        description = line[:line.rfind(amounts[-1])].strip() if amounts[-1] in line else line[:50]
                                        if description and amount > 0:
                                            extracted_transactions.append({
                                                'amount': amount,
                                                'description': description,
                                                'date': datetime.now().strftime('%Y-%m-%d')
                                            })
                                    except:
                                        pass
                    
                    if extracted_transactions:
                        transactions = extracted_transactions
                    else:
                        # Create transaction from PDF text
                        text_preview = text.replace('\n', ' ').strip()[:200]
                        transactions = [{
                            'amount': 0.0,
                            'description': f"PDF: {text_preview}...",
                            'date': datetime.now().strftime('%Y-%m-%d')
                        }]
            except Exception as e:
                file_warnings.append(f"Failed to parse PDF: {str(e)}")
                transactions = [{
                    'amount': 0.0,
                    'description': f"PDF file: {filename}",
                    'date': datetime.now().strftime('%Y-%m-%d')
                }]
                
        elif file_ext in ['txt']:
            try:
                # Try different encodings
                encodings = ['utf-8', 'latin-1', 'iso-8859-1']
                text = None
                for encoding in encodings:
                    try:
                        text = content.decode(encoding)
                        break
                    except:
                        continue
                
                if text is None:
                    text = content.decode('utf-8', errors='ignore')
                
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line and len(line) > 3:
                        amounts = re.findall(r'[\d,]+\.?\d*', line)
                        if amounts:
                            try:
                                amount = float(amounts[-1].replace(',', ''))
                                description = line[:line.rfind(amounts[-1])].strip() if amounts[-1] in line else line[:100]
                                if description:
                                    transactions.append({
                                        'amount': amount,
                                        'description': description,
                                        'date': datetime.now().strftime('%Y-%m-%d')
                                    })
                            except:
                                pass
                
                if not transactions:
                    # Create from text content
                    text_preview = text[:200].replace('\n', ' ')
                    transactions = [{
                        'amount': 0.0,
                        'description': f"Text file: {text_preview}...",
                        'date': datetime.now().strftime('%Y-%m-%d')
                    }]
            except Exception as e:
                file_warnings.append(f"Failed to parse text file: {str(e)}")
                transactions = [{
                    'amount': 0.0,
                    'description': f"Text file: {filename}",
                    'date': datetime.now().strftime('%Y-%m-%d')
                }]
                
        elif file_ext in ['jpg', 'jpeg', 'png']:
            file_warnings.append("Image files require OCR. Creating placeholder transaction.")
            transactions = [{
                'amount': 0.0,
                'description': f"Image file: {filename} (OCR not implemented)",
                'date': datetime.now().strftime('%Y-%m-%d')
            }]
        else:
            if df is None:
                file_warnings.append(f"Unknown file type: {file_ext}. Attempting to process as generic data.")
                # Try to create at least one transaction
                transactions = [{
                    'amount': 0.0,
                    'description': f"File: {filename}",
                    'date': datetime.now().strftime('%Y-%m-%d')
                }]
            
    except Exception as e:
        file_warnings.append(f"Error processing file: {str(e)}")
        # Always create at least one transaction so processing can continue
        transactions = [{
            'amount': 0.0,
            'description': f"File: {filename}",
            'date': datetime.now().strftime('%Y-%m-%d')
        }]
    
    # Ensure we always have at least one transaction
    if not transactions:
        transactions = [{
            'amount': 0.0,
            'description': f"File: {filename}",
            'date': datetime.now().strftime('%Y-%m-%d')
        }]
    
    return {
        'filename': filename,
        'transactions': transactions,
        'errors': file_errors,
        'warnings': file_warnings,
        'missing_values': missing_values_data  # Detailed missing value data for table display
    }


@app.post("/api/company/analyze")
async def analyze_company_files(
    files: List[UploadFile] = File(...),
    user_id: str = Form(None)
):
    """Analyze multiple files for company financial analysis"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        all_transactions = []
        all_file_errors = []
        all_file_warnings = []
        
        # Process all files - always succeeds
        for file in files:
            result = process_file(file)
            
            if result['errors']:
                all_file_errors.append({
                    'filename': result['filename'],
                    'errors': result['errors']
                })
            
            if result['warnings']:
                all_file_warnings.append({
                    'filename': result['filename'],
                    'warnings': result['warnings']
                })
            
            # Always extend transactions - process_file always returns at least one
            all_transactions.extend(result['transactions'])
        
        # Normalize all transactions - ensure they have required fields
        valid_transactions = []
        for txn in all_transactions:
            if isinstance(txn, dict):
                try:
                    # Ensure amount exists and is numeric
                    amount = txn.get('amount', 0)
                    try:
                        amount = float(amount) if amount is not None else 0.0
                    except (ValueError, TypeError):
                        amount = 0.0
                    
                    # Ensure description exists
                    description = str(txn.get('description', f"Transaction from file"))
                    if not description or description.strip() == '':
                        description = "Transaction"
                    
                    # Ensure date exists
                    date = txn.get('date')
                    if not date:
                        date = datetime.now().strftime('%Y-%m-%d')
                    
                    valid_transactions.append({
                        'amount': amount,
                        'description': description,
                        'date': date
                    })
                except Exception:
                    # If anything goes wrong, create a default transaction
                    valid_transactions.append({
                        'amount': 0.0,
                        'description': f"Transaction",
                        'date': datetime.now().strftime('%Y-%m-%d')
                    })
        
        # Always ensure we have at least one transaction
        if not valid_transactions:
            valid_transactions = [{
                'amount': 0.0,
                'description': 'File uploaded successfully',
                'date': datetime.now().strftime('%Y-%m-%d')
            }]
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(valid_transactions)
        
        # Ensure required columns exist (they should always exist now)
        if 'amount' not in df.columns:
            df['amount'] = 0.0
        if 'description' not in df.columns:
            df['description'] = 'Transaction'
        if 'date' not in df.columns:
            df['date'] = datetime.now().strftime('%Y-%m-%d')
        
        # Process and analyze data - with error handling
        try:
            processed_data = analysis_service.process_data(df)
        except Exception as e:
            # If processing fails, create default processed data
            processed_data = {
                "total_transactions": len(df),
                "total_amount": float(df['amount'].sum()) if 'amount' in df.columns else 0.0,
                "date_range": {
                    "start": datetime.now().strftime('%Y-%m-%d'),
                    "end": datetime.now().strftime('%Y-%m-%d')
                },
                "transactions": valid_transactions
            }
            all_file_warnings.append({
                'filename': 'system',
                'warnings': [f"Data processing warning: {str(e)}"]
            })
        
        try:
            categorized_data = analysis_service.categorize_expenses(df)
        except Exception as e:
            # Default categorized data
            categorized_data = {
                "categories": {},
                "category_totals": {},
                "category_percentages": {},
                "total_amount": processed_data.get("total_amount", 0),
                "transaction_count": len(df)
            }
        
        try:
            insights = analysis_service.generate_spending_insights(categorized_data)
        except Exception as e:
            insights = {
                "top_category": {"name": "Other", "percentage": 0, "amount": 0},
                "category_breakdown": {},
                "total_spent": processed_data.get("total_amount", 0),
                "transaction_count": len(df)
            }
        
        try:
            visualizations = analysis_service.generate_visualization_data(categorized_data)
        except Exception as e:
            visualizations = {
                "pie_chart": [],
                "bar_chart": [],
                "summary_stats": {"total_categories": 0, "largest_category": None, "smallest_category": None}
            }
        
        try:
            smart_score = scoring_service.calculate_smart_score(categorized_data)
        except Exception as e:
            smart_score = {
                "score": 5.0,
                "max_score": 10.0,
                "spender_rating": "Moderate Spender",
                "components": {},
                "savings_bonus": 0,
                "interpretation": "Analysis completed",
                "recommendations": []
            }
        
        # Prepare analysis result
        analysis_result = {
            **processed_data,
            "insights": insights,
            "visualizations": visualizations,
            "smart_score": smart_score,
            "file_errors": all_file_errors,
            "file_warnings": all_file_warnings,
            "id": f"analysis_{datetime.now().timestamp()}"
        }
        
        # Save to history
        try:
            analysis_id = history_service.save_analysis(user_id, "company", analysis_result)
            analysis_result["id"] = analysis_id
        except Exception:
            # If history save fails, continue anyway
            pass
        
        return JSONResponse(content=analysis_result)
        
    except HTTPException:
        raise
    except Exception as e:
        # Even if everything fails, return a basic result
        try:
            return JSONResponse(content={
                "total_transactions": 0,
                "total_amount": 0,
                "date_range": {"start": datetime.now().strftime('%Y-%m-%d'), "end": datetime.now().strftime('%Y-%m-%d')},
                "transactions": [],
                "insights": {"total_spent": 0, "transaction_count": 0, "top_category": {"name": "Other", "percentage": 0, "amount": 0}, "category_breakdown": {}},
                "visualizations": {"pie_chart": [], "bar_chart": []},
                "smart_score": {"score": 5.0, "spender_rating": "Moderate Spender", "interpretation": "Analysis completed", "recommendations": []},
                "file_errors": [],
                "file_warnings": [{"filename": "unknown", "warnings": [f"Error during analysis: {str(e)}"]}],
                "id": f"analysis_{datetime.now().timestamp()}"
            })
        except:
            # Last resort - return minimal response
            raise HTTPException(status_code=500, detail=f"Error analyzing files: {str(e)}")


@app.get("/api/company/history/{user_id}")
async def get_company_history(user_id: str):
    """Get analysis history for a company user"""
    try:
        history = history_service.get_user_history(user_id, account_type="company")
        return JSONResponse(content={"status": "success", "history": history})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@app.post("/api/company/report")
async def generate_company_report(data: Dict[str, Any]):
    """Generate PDF report for company analysis"""
    try:
        analysis_id = data.get("analysisId")
        if not analysis_id:
            raise HTTPException(status_code=400, detail="analysisId is required")
        
        # Get analysis from history
        analysis = history_service.get_analysis_by_id(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # For now, return a JSON response
        # In production, you would generate an actual PDF here
        return JSONResponse(content={
            "status": "success",
            "message": "Report generation not yet implemented. Use analysis data directly.",
            "analysis": analysis
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


def generate_pie_chart(category_breakdown, output_path):
    """Generate a pie chart for category breakdown"""
    try:
        if not category_breakdown:
            return None
        
        sorted_categories = sorted(
            category_breakdown.items(),
            key=lambda x: x[1].get('amount', 0),
            reverse=True
        )[:8]  # Top 8 categories
        
        if not sorted_categories:
            return None
        
        labels = [cat[0] for cat in sorted_categories]
        amounts = [cat[1].get('amount', 0) for cat in sorted_categories]
        colors_list = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                       '#ec4899', '#06b6d4', '#84cc16']
        
        fig, ax = plt.subplots(figsize=(8, 8))
        wedges, texts, autotexts = ax.pie(
            amounts,
            labels=labels,
            autopct='%1.1f%%',
            colors=colors_list[:len(labels)],
            startangle=90,
            textprops={'fontsize': 10, 'weight': 'bold'}
        )
        
        # Make percentage text larger and bold
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontsize(11)
            autotext.set_weight('bold')
        
        ax.set_title('Spending by Category', fontsize=16, fontweight='bold', pad=20)
        plt.tight_layout()
        plt.savefig(output_path, format='png', dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating pie chart: {str(e)}")
        return None

def generate_bar_chart(category_breakdown, output_path):
    """Generate a bar chart for top categories"""
    try:
        if not category_breakdown:
            return None
        
        sorted_categories = sorted(
            category_breakdown.items(),
            key=lambda x: x[1].get('amount', 0),
            reverse=True
        )[:10]  # Top 10 categories
        
        if not sorted_categories:
            return None
        
        categories = [cat[0][:20] for cat in sorted_categories]  # Truncate long names
        amounts = [cat[1].get('amount', 0) for cat in sorted_categories]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        bars = ax.barh(categories, amounts, color='#2563eb', edgecolor='#1e40af', linewidth=1)
        
        # Add value labels on bars
        for i, (bar, amount) in enumerate(zip(bars, amounts)):
            width = bar.get_width()
            ax.text(width, bar.get_y() + bar.get_height()/2, 
                   f'₹{amount:,.2f}',
                   ha='left', va='center', fontweight='bold', fontsize=10)
        
        ax.set_xlabel('Amount (₹)', fontsize=12, fontweight='bold')
        ax.set_title('Top Spending Categories', fontsize=14, fontweight='bold', pad=20)
        ax.grid(axis='x', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)
        plt.tight_layout()
        plt.savefig(output_path, format='png', dpi=150, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating bar chart: {str(e)}")
        return None

@app.get("/api/company/report/{analysis_id}")
async def download_company_report(analysis_id: str):
    """Download PDF report for a specific analysis"""
    try:
        analysis = history_service.get_analysis_by_id(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=72)
        
        # Container for the 'Flowable' objects
        elements = []
        styles = getSampleStyleSheet()
        
        # Simple header
        header_style = ParagraphStyle(
            'HeaderStyle', parent=styles['Heading1'],
            fontSize=24, textColor=colors.HexColor('#2563eb'),
            alignment=TA_CENTER, fontName='Helvetica-Bold',
            spaceAfter=10
        )
        elements.append(Paragraph("OpenAudit", header_style))
        elements.append(Paragraph("Financial Analysis Report", ParagraphStyle(
            'TitleStyle', parent=styles['Heading1'],
            fontSize=18, textColor=colors.black,
            alignment=TA_CENTER, fontName='Helvetica-Bold',
            spaceAfter=20
        )))
        elements.append(Spacer(1, 0.3*inch))
        
        # Report metadata
        report_date = analysis.get('created_at', 'N/A')
        if isinstance(report_date, str) and report_date != 'N/A':
            try:
                date_obj = datetime.fromisoformat(report_date.replace('Z', '+00:00'))
                formatted_date = date_obj.strftime('%B %d, %Y at %I:%M %p')
            except:
                formatted_date = report_date
        else:
            formatted_date = datetime.now().strftime('%B %d, %Y at %I:%M %p')
        
        metadata_data = [
            ['Analysis ID:', analysis_id],
            ['Report Date:', formatted_date],
        ]
        metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Executive Summary
        heading_style = ParagraphStyle(
            'HeadingStyle', parent=styles['Heading2'],
            fontSize=14, textColor=colors.HexColor('#1e40af'),
            spaceAfter=12, spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        elements.append(Paragraph("Executive Summary", heading_style))
        smart_score = analysis.get('smart_score', {})
        insights_summary = analysis.get('insights_summary', {})
        date_range = analysis.get('date_range', {})
        rupee_symbol = '₹'
        
        summary_data = [
            ['Total Transactions:', str(analysis.get('total_transactions', 0))],
            ['Total Amount:', f"{rupee_symbol}{analysis.get('total_amount', 0):,.2f}"],
            ['Date Range:', f"{date_range.get('start', 'N/A')} to {date_range.get('end', 'N/A')}"],
        ]
        summary_table = Table(summary_data, colWidths=[2.5*inch, 3.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eff6ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Financial Health Score
        elements.append(Paragraph("Financial Health Score", heading_style))
        score_value = smart_score.get('score', 0)
        rating = smart_score.get('spender_rating', 'N/A')
        
        score_data = [
            ['Score:', f"{score_value:.1f}/10"],
            ['Rating:', rating],
        ]
        score_table = Table(score_data, colWidths=[2.5*inch, 3.5*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0fdf4')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # Category Breakdown
        elements.append(Paragraph("Spending Categories", heading_style))
        category_breakdown = insights_summary.get('category_breakdown', {})
        top_category = insights_summary.get('top_category', {})
        
        if category_breakdown:
            category_data = [['Category', 'Amount', 'Percentage']]
            sorted_categories = sorted(
                category_breakdown.items(),
                key=lambda x: x[1].get('amount', 0),
                reverse=True
            )[:10]  # Top 10 categories
            
            for cat_name, cat_data in sorted_categories:
                category_data.append([
                    cat_name,
                    f"{rupee_symbol}{cat_data.get('amount', 0):,.2f}",
                    f"{cat_data.get('percentage', 0):.1f}%"
                ])
            
            category_table = Table(category_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            category_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
            ]))
            elements.append(category_table)
        else:
            elements.append(Paragraph("No category data available.", styles['Normal']))
        
        elements.append(Spacer(1, 0.3*inch))
        
        # File Quality
        file_errors = analysis.get('file_errors', [])
        file_warnings = analysis.get('file_warnings', [])
        
        if file_errors or file_warnings:
            elements.append(Paragraph("File Processing Information", heading_style))
            quality_data = [
                ['Errors:', str(len(file_errors))],
                ['Warnings:', str(len(file_warnings))],
            ]
            quality_table = Table(quality_data, colWidths=[2.5*inch, 3.5*inch])
            quality_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#fee2e2')),
                ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#fef3c7')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(quality_table)
            elements.append(Spacer(1, 0.2*inch))
        
        # Footer with copyright
        elements.append(Spacer(1, 0.5*inch))
        footer_style = ParagraphStyle(
            'FooterStyle', parent=styles['Normal'],
            fontSize=8, textColor=colors.grey,
            alignment=TA_CENTER, spaceBefore=20
        )
        current_year = datetime.now().year
        elements.append(Paragraph(
            f"© {current_year} OpenAudit. All rights reserved.<br/>"
            "This report is generated by OpenAudit financial analysis platform.",
            footer_style
        ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Return PDF
        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Report_{analysis_id}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF report: {str(e)}")


@app.post("/api/company/suggestions")
async def get_company_suggestions(data: Dict[str, Any]):
    """Get AI suggestions based on analysis data"""
    try:
        insights = data.get("insights", {})
        smart_score = data.get("smart_score", {})
        visualizations = data.get("visualizations", {})
        
        suggestions = []
        
        # Generate suggestions based on insights
        top_category = insights.get("top_category", {})
        if top_category and top_category.get("percentage", 0) > 30:
            suggestions.append({
                "type": "warning",
                "title": f"High Spending in {top_category.get('name', 'Category')}",
                "message": f"You're spending {top_category.get('percentage', 0):.1f}% of your budget on {top_category.get('name', 'this category')}. Consider reviewing expenses in this category.",
                "priority": "high"
            })
        
        category_breakdown = insights.get("category_breakdown", {})
        categories = sorted(
            [(cat, data) for cat, data in category_breakdown.items()],
            key=lambda x: x[1].get("percentage", 0),
            reverse=True
        )
        
        for cat_name, cat_data in categories[:3]:
            pct = cat_data.get("percentage", 0)
            if pct > 20:
                suggestions.append({
                    "type": "info",
                    "title": f"Optimize {cat_name} Spending",
                    "message": f"Your {cat_name} expenses account for {pct:.1f}% of total spending (₹{cat_data.get('amount', 0):,.2f}). Look for opportunities to reduce costs here.",
                    "priority": "medium"
                })
        
        score = smart_score.get("score", 0)
        if score < 5:
            suggestions.append({
                "type": "critical",
                "title": "Improve Spending Patterns",
                "message": f"Your Financial Health Score is {score:.1f}/10. Consider reviewing your spending habits and creating a budget.",
                "priority": "high"
            })
        
        recommendations = smart_score.get("recommendations", [])
        for rec in recommendations[:2]:
            suggestions.append({
                "type": "info",
                "title": "Recommendation",
                "message": rec,
                "priority": "medium"
            })
        
        if not suggestions:
            suggestions.append({
                "type": "success",
                "title": "Good Financial Health",
                "message": "Your financial patterns look healthy. Continue monitoring to maintain this status.",
                "priority": "low"
            })
        
        return JSONResponse(content={"status": "success", "suggestions": suggestions})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


# Add new endpoint to save personal analysis to history
@app.post("/api/personal/analyze")
async def save_personal_analysis(data: Dict[str, Any]):
    """Save personal analysis to history"""
    try:
        user_id = data.get("user_id")
        analysis_data = data.get("analysis_data")
        
        if not user_id or not analysis_data:
            raise HTTPException(status_code=400, detail="user_id and analysis_data are required")
        
        analysis_id = history_service.save_analysis(user_id, "personal", analysis_data)
        
        return JSONResponse({
            "status": "success",
            "analysis_id": analysis_id,
            "message": "Analysis saved to history"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving analysis: {str(e)}")


@app.get("/api/personal/history/{user_id}")
async def get_personal_history(user_id: str):
    """Get analysis history for a personal user"""
    try:
        history = history_service.get_user_history(user_id, account_type="personal")
        return JSONResponse(content={"status": "success", "history": history})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@app.get("/api/personal/visualizations/{analysis_id}")
async def get_personal_visualizations(analysis_id: str):
    """Generate visualization images for personal analysis using matplotlib"""
    try:
        # Get the analysis from history
        analysis = history_service.get_analysis_by_id(analysis_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Get visualization data
        visualizations = analysis.get('visualizations', {})
        category_totals = {}
        category_percentages = {}
        
        # Extract data from pie_chart or bar_chart format
        pie_chart = visualizations.get('pie_chart', [])
        bar_chart = visualizations.get('bar_chart', [])
        
        if pie_chart:
            for item in pie_chart:
                category_totals[item.get('name', 'Unknown')] = item.get('value', 0)
        elif bar_chart:
            for item in bar_chart:
                category_totals[item.get('category', 'Unknown')] = item.get('amount', 0)
                category_percentages[item.get('category', 'Unknown')] = item.get('percentage', 0)
        
        # If no visualization data, try to reconstruct from insights
        if not category_totals and analysis.get('insights'):
            category_breakdown = analysis.get('insights', {}).get('category_breakdown', {})
            for category, data in category_breakdown.items():
                category_totals[category] = data.get('amount', 0)
                category_percentages[category] = data.get('percentage', 0)
        
        if not category_totals:
            raise HTTPException(status_code=404, detail="No visualization data available")
        
        # Create output directory for charts
        import tempfile
        import base64
        chart_dir = tempfile.mkdtemp()
        
        # Generate pie chart
        pie_chart_path = os.path.join(chart_dir, 'pie_chart.png')
        fig, ax = plt.subplots(figsize=(10, 8))
        
        categories = list(category_totals.keys())
        amounts = list(category_totals.values())
        
        # Create pie chart with better styling
        colors_list = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#64748b', '#84cc16']
        colors_cycle = colors_list * ((len(categories) // len(colors_list)) + 1)
        
        wedges, texts, autotexts = ax.pie(
            amounts,
            labels=categories,
            autopct='%1.1f%%',
            startangle=90,
            colors=colors_cycle[:len(categories)],
            textprops={'fontsize': 10, 'fontweight': 'bold'}
        )
        
        ax.set_title('Spending Distribution by Category', fontsize=16, fontweight='bold', pad=20)
        plt.tight_layout()
        plt.savefig(pie_chart_path, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        
        # Generate bar chart
        bar_chart_path = os.path.join(chart_dir, 'bar_chart.png')
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Sort by amount descending
        sorted_data = sorted(zip(categories, amounts), key=lambda x: x[1], reverse=True)
        sorted_categories = [cat for cat, _ in sorted_data]
        sorted_amounts = [amt for _, amt in sorted_data]
        
        # Create bar chart
        bars = ax.barh(sorted_categories, sorted_amounts, color=colors_cycle[:len(sorted_categories)])
        
        # Add value labels on bars
        for i, (bar, amount) in enumerate(zip(bars, sorted_amounts)):
            width = bar.get_width()
            ax.text(width, bar.get_y() + bar.get_height()/2, 
                   f'₹{amount:,.2f}',
                   ha='left', va='center', fontweight='bold', fontsize=10)
        
        ax.set_xlabel('Amount (₹)', fontsize=12, fontweight='bold')
        ax.set_title('Top Spending Categories', fontsize=14, fontweight='bold', pad=20)
        ax.grid(axis='x', alpha=0.3, linestyle='--')
        plt.tight_layout()
        plt.savefig(bar_chart_path, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()
        
        # Read images and convert to base64
        with open(pie_chart_path, 'rb') as f:
            pie_image = base64.b64encode(f.read()).decode('utf-8')
        
        with open(bar_chart_path, 'rb') as f:
            bar_image = base64.b64encode(f.read()).decode('utf-8')
        
        # Clean up temp files
        import shutil
        shutil.rmtree(chart_dir)
        
        return JSONResponse(content={
            "status": "success",
            "pie_chart": f"data:image/png;base64,{pie_image}",
            "bar_chart": f"data:image/png;base64,{bar_image}"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating visualizations: {str(e)}")


@app.get("/api/personal/report/{analysis_id}")
async def download_personal_report(analysis_id: str):
    """Download PDF report for a personal analysis"""
    try:
        # Get the analysis from history
        analysis = history_service.get_analysis_by_id(analysis_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # For now, return a simple PDF. In production, you might want to generate a full report
        # similar to company reports but tailored for personal users
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=72)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        header_style = ParagraphStyle(
            'HeaderStyle', parent=styles['Heading1'],
            fontSize=28, textColor=colors.HexColor('#2563eb'),
            alignment=TA_CENTER, fontName='Helvetica-Bold',
            spaceAfter=10
        )
        elements.append(Paragraph("OpenAudit", header_style))
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("Personal Financial Analysis Report", styles['Heading2']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Report Content
        normal_style = ParagraphStyle(
            'NormalStyle', parent=styles['Normal'],
            fontSize=11, textColor=colors.black,
            alignment=TA_LEFT, fontName='Helvetica',
            leading=14
        )
        
        report_text = f"""
        <b>Analysis ID:</b> {analysis_id}<br/>
        <b>Date:</b> {analysis.get('created_at', 'N/A')}<br/>
        <b>Total Transactions:</b> {analysis.get('total_transactions', 0)}<br/>
        <b>Total Amount:</b> ₹{analysis.get('total_amount', 0):,.2f}<br/>
        <b>Smart Score:</b> {analysis.get('smart_score', {}).get('score', 'N/A')}/10<br/>
        <b>Spender Rating:</b> {analysis.get('smart_score', {}).get('spender_rating', 'N/A')}<br/>
        """
        
        elements.append(Paragraph(report_text, normal_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Footer
        footer_style = ParagraphStyle(
            'FooterStyle', parent=styles['Normal'],
            fontSize=8, textColor=colors.grey,
            alignment=TA_CENTER, spaceBefore=20
        )
        current_year = datetime.now().year
        elements.append(Paragraph(
            f"© {current_year} OpenAudit. All rights reserved.<br/>"
            f"Analysis ID: {analysis_id}<br/>"
            "This report is generated for personal use only.",
            footer_style
        ))
        
        doc.build(elements)
        buffer.seek(0)
        
        return Response(
            content=buffer.read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Personal_Report_{analysis_id}.pdf"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF report: {str(e)}")


# Authentication Endpoints
@app.post("/api/auth/login")
async def login(data: Dict[str, Any]):
    """User login endpoint"""
    try:
        username = data.get("username")
        password = data.get("password")
        
        print(f"[LOGIN API] Received login request for: {username}")
        
        if not username or not password:
            print(f"[LOGIN API] Missing username or password")
            raise HTTPException(status_code=400, detail="Username and password are required")
        
        result = auth_service.login(username, password)
        
        print(f"[LOGIN API] Auth service result: {result.get('success')}")
        
        if result["success"]:
            print(f"[LOGIN API] Login successful, returning user: {result['user']}")
            return JSONResponse(content={
                "status": "success",
                "user": result["user"],
                "message": result["message"]
            })
        else:
            print(f"[LOGIN API] Login failed: {result.get('message')}")
            raise HTTPException(status_code=401, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[LOGIN API] Error during login: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")


@app.post("/api/auth/register")
async def register(data: Dict[str, Any]):
    """User registration endpoint"""
    try:
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        account_type = data.get("account_type", "personal")
        full_name = data.get("full_name", "")
        contact_number = data.get("contact_number", "")
        
        if not username or not email or not password:
            raise HTTPException(status_code=400, detail="Username, email, and password are required")
        
        result = auth_service.register_user(username, email, password, account_type, full_name, contact_number)
        
        if result["success"]:
            return JSONResponse(content={
                "status": "success",
                "message": result["message"],
                "otp": result["otp"]  # For development, return OTP. In production, send via SMS/Email
            })
        else:
            raise HTTPException(status_code=400, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during registration: {str(e)}")


@app.post("/api/auth/verify-otp")
async def verify_otp(data: Dict[str, Any]):
    """Verify OTP endpoint"""
    try:
        email = data.get("email")
        otp = data.get("otp")
        
        if not email or not otp:
            raise HTTPException(status_code=400, detail="Email and OTP are required")
        
        result = auth_service.verify_otp(email, otp)
        
        if result["success"]:
            return JSONResponse(content={
                "status": "success",
                "message": result["message"]
            })
        else:
            raise HTTPException(status_code=400, detail=result["message"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying OTP: {str(e)}")


@app.get("/api/auth/users")
async def get_users():
    """Get all users (admin only)"""
    try:
        users = auth_service.get_all_users()
        return JSONResponse(content={
            "status": "success",
            "users": users
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


# File Upload and Analysis Endpoints
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    pdf_password: Optional[str] = Form(None)
):
    """Upload and process a single file"""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        result = process_file(file)
        
        # Don't block on errors - process_file always returns at least one transaction
        # Errors are reported but don't stop processing
        if not result['transactions']:
            raise HTTPException(status_code=400, detail="No transaction data could be extracted from the file")
        
        # Convert transactions to DataFrame for initial processing
        df = pd.DataFrame(result['transactions'])
        
        # DEBUG: Log what we got from file processing
        if len(df) > 0:
            print(f"[UPLOAD DEBUG] Received {len(df)} transactions from file processing")
            print(f"[UPLOAD DEBUG] Sample transaction: {df.iloc[0].to_dict() if len(df) > 0 else 'None'}")
            if 'amount' in df.columns:
                total_from_file = float(df['amount'].sum())
                non_zero_from_file = len(df[df['amount'] > 0])
                print(f"[UPLOAD DEBUG] Total amount: {total_from_file}, Non-zero transactions: {non_zero_from_file}")
                print(f"[UPLOAD DEBUG] Amount values: {df['amount'].tolist()[:10]}")
        
        processed_data = analysis_service.process_data(df)
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                **processed_data,
                "transactions": processed_data.get("transactions", []),
                "file_errors": result.get("errors", []),
                "file_warnings": result.get("warnings", []),
                "missing_values": result.get("missing_values", [])  # Detailed missing value data
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/api/analyze")
async def analyze_data(data: Dict[str, Any]):
    """Analyze financial transaction data"""
    try:
        transactions = data.get("transactions", [])
        
        if not transactions:
            raise HTTPException(status_code=400, detail="No transactions provided")
        
        # Ensure transactions is a list of dicts with required fields
        valid_transactions = []
        for txn in transactions:
            if isinstance(txn, dict):
                # Extract amount - prefer amount_abs if available (from upload), otherwise use amount
                amount_raw = txn.get('amount_abs') or txn.get('amount', 0)
                try:
                    amount = float(amount_raw)
                    # Use absolute value for expenses (treat negative as positive)
                    amount = abs(amount)
                except (ValueError, TypeError):
                    amount = 0.0
                
                txn_dict = {
                    'amount': amount,  # Already absolute
                    'description': str(txn.get('description', 'Unknown'))
                }
                if 'date' in txn and txn['date']:
                    txn_dict['date'] = txn['date']
                else:
                    txn_dict['date'] = datetime.now().strftime('%Y-%m-%d')
                valid_transactions.append(txn_dict)
        
        if not valid_transactions:
            raise HTTPException(status_code=400, detail="No valid transactions found")
        
        # Convert to DataFrame
        df = pd.DataFrame(valid_transactions)
        
        # Check if DataFrame is empty
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No valid transactions found after processing")
        
        # Ensure amount column is numeric
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df['amount'] = df['amount'].fillna(0)
        # Already absolute from above, but ensure it's still absolute
        df['amount'] = df['amount'].abs()
        
        # DEBUG: Log transaction counts and totals before processing
        total_before = float(df['amount'].sum())
        non_zero_count = len(df[df['amount'] > 0])
        print(f"[ANALYZE DEBUG] DataFrame: {len(df)} rows, total={total_before}, non-zero={non_zero_count}")
        if len(df) > 0:
            print(f"[ANALYZE DEBUG] First transaction: {df.iloc[0].to_dict()}")
            print(f"[ANALYZE DEBUG] Amounts: {df['amount'].tolist()[:10]}")
        
        # Ensure date column exists and is datetime
        if 'date' not in df.columns:
            df['date'] = datetime.now().strftime('%Y-%m-%d')
        else:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            # Fill NaT with current date
            df['date'] = df['date'].fillna(pd.Timestamp.now())
        
        # Debug: Log amount info
        if len(df) > 0:
            total = float(df['amount'].sum())
            non_zero_count = len(df[df['amount'] > 0])
            print(f"[DEBUG] DataFrame has {len(df)} transactions, total={total}, non-zero={non_zero_count}")
        
        # Process and analyze data
        processed_data = analysis_service.process_data(df)
        categorized_data = analysis_service.categorize_expenses(df)
        insights = analysis_service.generate_spending_insights(categorized_data)
        visualizations = analysis_service.generate_visualization_data(categorized_data)
        smart_score = scoring_service.calculate_smart_score(categorized_data)
        
        # Generate report
        report = nlg_service.generate_report(insights, smart_score)
        
        # Ensure insights includes transactions for line chart
        insights_with_transactions = {
            **insights,
            "transactions": processed_data.get("transactions", [])
        }
        
        # DEBUG: Log final response structure
        print(f"[ANALYZE FINAL] total_spent in insights: {insights_with_transactions.get('total_spent')}")
        print(f"[ANALYZE FINAL] transaction_count: {insights_with_transactions.get('transaction_count')}")
        print(f"[ANALYZE FINAL] total_amount from processed_data: {processed_data.get('total_amount')}")
        print(f"[ANALYZE FINAL] insights keys: {list(insights_with_transactions.keys())}")
        
        response_data = {
            "status": "success",
            **processed_data,
            "insights": insights_with_transactions,
            "visualizations": visualizations,
            "smart_score": smart_score,
            "report": report
        }
        
        return JSONResponse(content=response_data)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analyzing data: {str(e)}")


# Bias Detection Endpoint
@app.post("/api/bias-detection")
async def detect_bias(data: Dict[str, Any]):
    """Detect bias in dataset"""
    try:
        dataset = data.get("dataset", [])
        sensitive_attributes = data.get("sensitive_attributes", [])
        decision_attribute = data.get("decision_attribute", "approved")
        
        if not dataset:
            raise HTTPException(status_code=400, detail="Dataset is required")
        
        if not sensitive_attributes:
            raise HTTPException(status_code=400, detail="Sensitive attributes are required")
        
        # Convert to DataFrame
        df = pd.DataFrame(dataset)
        
        # Detect bias
        result = bias_detection_service.detect_bias(df, sensitive_attributes, decision_attribute)
        
        # Generate report
        report = nlg_service.generate_bias_report(result)
        
        return JSONResponse(content={
            "status": "success",
            **result,
            "report": report
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting bias: {str(e)}")


# Admin Endpoints
@app.get("/api/admin/user-data/{user_id}")
async def get_user_data(user_id: str):
    """Get user data for admin portal"""
    try:
        # Get user from auth service
        user = auth_service.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's history
        personal_history = history_service.get_user_history(user_id, account_type="personal")
        company_history = history_service.get_user_history(user_id, account_type="company")
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                "user": user,
                "uploads": [],  # Placeholder - could be expanded later
                "analyses": {
                    "personal": personal_history,
                    "company": company_history
                }
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user data: {str(e)}")


# ============================================================================
# Contract Endpoints
# ============================================================================

def generate_contract_pdf(company_name: str, contract_id: str) -> io.BytesIO:
    """Generate contract PDF with OpenAudit branding"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Header with OpenAudit
    header_style = ParagraphStyle(
        'HeaderStyle', parent=styles['Heading1'],
        fontSize=28, textColor=colors.HexColor('#2563eb'),
        alignment=TA_CENTER, fontName='Helvetica-Bold',
        spaceAfter=10
    )
    elements.append(Paragraph("OpenAudit", header_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Contract Title
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading1'],
        fontSize=20, textColor=colors.black,
        alignment=TA_CENTER, fontName='Helvetica-Bold',
        spaceAfter=20
    )
    elements.append(Paragraph("DATA CONFIDENTIALITY AGREEMENT", title_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Contract Content
    normal_style = ParagraphStyle(
        'NormalStyle', parent=styles['Normal'],
        fontSize=11, textColor=colors.black,
        alignment=TA_LEFT, fontName='Helvetica',
        leading=14
    )
    
    contract_text = f"""
This Data Confidentiality Agreement ("Agreement") is entered into on {datetime.now().strftime("%B %d, %Y")} between OpenAudit ("Service Provider") and {company_name} ("Company").

<b>1. CONFIDENTIAL INFORMATION</b><br/><br/>

For purposes of this Agreement, "Confidential Information" shall mean all financial data, transaction records, business information, and any other data provided by the Company to OpenAudit for the purpose of financial analysis and auditing services.

<b>2. OBLIGATIONS OF OPENAUDIT</b><br/><br/>

OpenAudit agrees to:<br/>
a) Hold all Confidential Information in strict confidence;<br/>
b) Not disclose, share, or distribute any Confidential Information to any third party without prior written consent from the Company;<br/>
c) Use Confidential Information solely for the purpose of providing financial analysis services to the Company;<br/>
d) Implement reasonable security measures to protect Confidential Information from unauthorized access, disclosure, or use;<br/>
e) Not use Confidential Information for any purpose other than providing services to the Company.<br/><br/>

<b>3. OBLIGATIONS OF COMPANY</b><br/><br/>

The Company agrees to:<br/>
a) Provide accurate and complete financial data for analysis;<br/>
b) Inform OpenAudit of any changes to the data that may affect the analysis;<br/>
c) Use the analysis results responsibly and in accordance with applicable laws and regulations.<br/><br/>

<b>4. DATA RETENTION AND DESTRUCTION</b><br/><br/>

OpenAudit will retain Confidential Information only as long as necessary to provide the requested services or as required by law. Upon termination of services, OpenAudit will either return or securely destroy all Confidential Information upon Company's request.

<b>5. EXCEPTIONS</b><br/><br/>

The obligations of confidentiality shall not apply to information that:<br/>
a) Was already known to OpenAudit prior to disclosure;<br/>
b) Is publicly available or becomes publicly available through no breach of this Agreement;<br/>
c) Is required to be disclosed by law or court order.<br/><br/>

<b>6. TERM</b><br/><br/>

This Agreement shall remain in effect for the duration of the service relationship between OpenAudit and the Company, and shall continue to apply to Confidential Information disclosed during such relationship.

<b>7. REMEDIES</b><br/><br/>

In the event of a breach of this Agreement, the non-breaching party shall be entitled to seek all available remedies at law or in equity, including but not limited to injunctive relief.

<b>8. GOVERNING LAW</b><br/><br/>

This Agreement shall be governed by and construed in accordance with applicable laws and regulations.

<b>9. ENTIRE AGREEMENT</b><br/><br/>

This Agreement constitutes the entire agreement between the parties regarding the confidentiality of data and supersedes all prior agreements or understandings.
"""
    
    elements.append(Paragraph(contract_text, normal_style))
    elements.append(Spacer(1, 0.4*inch))
    
    # Signature Section
    signature_style = ParagraphStyle(
        'SignatureStyle', parent=styles['Normal'],
        fontSize=11, textColor=colors.black,
        alignment=TA_LEFT, fontName='Helvetica-Bold'
    )
    
    signature_data = [
        ['Company Representative:', '___________________', 'OpenAudit Representative:', '___________________'],
        ['Name:', '___________________', 'Name:', '___________________'],
        ['Title:', '___________________', 'Title:', '___________________'],
        ['Date:', '___________________', 'Date:', '___________________'],
    ]
    signature_table = Table(signature_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
    signature_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(signature_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Footer
    footer_style = ParagraphStyle(
        'FooterStyle', parent=styles['Normal'],
        fontSize=8, textColor=colors.grey,
        alignment=TA_CENTER, spaceBefore=20
    )
    current_year = datetime.now().year
    elements.append(Paragraph(
        f"© {current_year} OpenAudit. All rights reserved.<br/>"
        f"Contract ID: {contract_id}<br/>"
        "This contract is a legal agreement between OpenAudit and the Company.",
        footer_style
    ))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

@app.post("/api/company/contract/request")
async def request_contract(data: Dict[str, Any]):
    """Company requests a contract"""
    try:
        company_id = data.get("company_id")
        company_name = data.get("company_name", "Company")
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        contract = contract_service.request_contract(company_id, company_name)
        
        if "error" in contract:
            raise HTTPException(status_code=400, detail=contract["error"])
        
        return JSONResponse(content={"status": "success", "contract": contract})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error requesting contract: {str(e)}")

@app.get("/api/company/contract/{company_id}")
async def get_company_contract(company_id: str):
    """Get contract for a company"""
    try:
        contract = contract_service.get_company_contract(company_id)
        if not contract:
            return JSONResponse(content={"status": "not_found", "contract": None})
        return JSONResponse(content={"status": "success", "contract": contract})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contract: {str(e)}")

@app.get("/api/admin/contracts/pending")
async def get_pending_contracts():
    """Get all pending contracts for admin"""
    try:
        contracts = contract_service.get_pending_contracts()
        return JSONResponse(content={"status": "success", "contracts": contracts})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching pending contracts: {str(e)}")

@app.get("/api/admin/contracts")
async def get_all_contracts():
    """Get all contracts for admin"""
    try:
        contracts = contract_service.get_all_contracts()
        return JSONResponse(content={"status": "success", "contracts": contracts})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts: {str(e)}")

@app.post("/api/admin/contract/sign")
async def sign_contract_admin(contract_id: str = Form(...), signature: str = Form(...), file: UploadFile = File(...)):
    """Admin signs and uploads the contract"""
    try:
        # Save uploaded PDF
        contract_dir = "database/contracts"
        os.makedirs(contract_dir, exist_ok=True)
        file_path = os.path.join(contract_dir, f"{contract_id}_signed.pdf")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        contract = contract_service.sign_contract_admin(contract_id, signature, file_path)
        
        if "error" in contract:
            raise HTTPException(status_code=400, detail=contract["error"])
        
        return JSONResponse(content={"status": "success", "contract": contract})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error signing contract: {str(e)}")

@app.post("/api/admin/contract/update")
async def update_signed_contract(contract_id: str = Form(...), file: UploadFile = File(...)):
    """Admin updates/re-uploads signed contract"""
    try:
        # Save uploaded PDF
        contract_dir = "database/contracts"
        os.makedirs(contract_dir, exist_ok=True)
        file_path = os.path.join(contract_dir, f"{contract_id}_signed.pdf")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        contract = contract_service.update_signed_contract(contract_id, file_path)
        
        if "error" in contract:
            raise HTTPException(status_code=400, detail=contract["error"])
        
        return JSONResponse(content={"status": "success", "contract": contract})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contract: {str(e)}")

@app.get("/api/contract/{contract_id}/download")
async def download_contract(contract_id: str, type: str = "template"):
    """Download contract (template or signed)"""
    try:
        contracts = contract_service.get_all_contracts()
        contract = next((c for c in contracts if c.get("id") == contract_id), None)
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        if type == "signed" and contract.get("signed_contract_pdf_path"):
            # Return signed contract
            if os.path.exists(contract["signed_contract_pdf_path"]):
                return FileResponse(
                    contract["signed_contract_pdf_path"],
                    media_type="application/pdf",
                    filename=f"Contract_{contract_id}_Signed.pdf"
                )
            else:
                raise HTTPException(status_code=404, detail="Signed contract file not found")
        else:
            # Generate and return template contract
            company_name = contract.get("company_name", "Company")
            contract_pdf = generate_contract_pdf(company_name, contract_id)
            contract_pdf.seek(0)
            
            return Response(
                content=contract_pdf.read(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="Contract_{contract_id}.pdf"'
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading contract: {str(e)}")

@app.post("/api/company/contract/sign")
async def sign_contract_company(data: Dict[str, Any]):
    """Company signs the contract"""
    try:
        company_id = data.get("company_id")
        signature = data.get("signature", "")
        
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        
        contract = contract_service.sign_contract_company(company_id, signature)
        
        if "error" in contract:
            raise HTTPException(status_code=400, detail=contract["error"])
        
        return JSONResponse(content={"status": "success", "contract": contract})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error signing contract: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "OpenAudit API", "status": "running"}


# ============================================================================
# AI AUDIT ENDPOINTS - Comprehensive Company Auditing
# ============================================================================

@app.post("/api/company/audit")
async def perform_company_audit(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    company_name: str = Form(...),
    industry: str = Form(...),
    company_size: str = Form(...),
    location: str = Form(...),
    fiscal_year: Optional[str] = Form(None),
    accounting_standards: Optional[str] = Form("IFRS"),
    regulatory_framework: Optional[str] = Form("India")
):
    """
    Perform comprehensive AI-powered audit on company financial data
    
    Required:
    - files: Financial statements, transaction files
    - user_id: Company user ID
    - company_name: Name of the company
    - industry: Industry sector
    - company_size: Small/Medium/Large
    - location: Company location
    
    Optional:
    - fiscal_year: Fiscal year (defaults to current year)
    - accounting_standards: IFRS/GAAP/Ind AS (defaults to IFRS)
    - regulatory_framework: India/US/EU (defaults to India)
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Process all uploaded files
        all_transactions = []
        all_file_errors = []
        all_file_warnings = []
        all_missing_values = []  # Store all missing value data
        
        for file in files:
            result = process_file(file)
            
            if result['errors']:
                all_file_errors.append({
                    'filename': result['filename'],
                    'errors': result['errors']
                })
            
            if result['warnings']:
                all_file_warnings.append({
                    'filename': result['filename'],
                    'warnings': result['warnings']
                })
            
            # Collect missing value data
            if result.get('missing_values'):
                all_missing_values.extend(result['missing_values'])
            
            all_transactions.extend(result['transactions'])
        
        # Validate and normalize transactions
        valid_transactions = []
        for txn in all_transactions:
            if isinstance(txn, dict):
                try:
                    amount = float(txn.get('amount', 0))
                    amount = abs(amount)
                    valid_transactions.append({
                        'amount': amount,
                        'description': str(txn.get('description', 'Transaction')),
                        'date': txn.get('date', datetime.now().strftime('%Y-%m-%d'))
                    })
                except:
                    continue
        
        if not valid_transactions:
            raise HTTPException(status_code=400, detail="No valid transaction data found")
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(valid_transactions)
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0).abs()
        
        # Perform financial analysis
        processed_data = analysis_service.process_data(df)
        categorized_data = analysis_service.categorize_expenses(df)
        
        # Generate spending insights
        insights = analysis_service.generate_spending_insights(categorized_data)
        
        # Generate visualization data (pie chart and bar chart)
        visualizations = analysis_service.generate_visualization_data(categorized_data)
        
        # Calculate smart score
        smart_score = scoring_service.calculate_smart_score(categorized_data)
        
        # Prepare company data for audit
        company_data = {
            'company_name': company_name,
            'industry': industry,
            'company_size': company_size,
            'location': location,
            'fiscal_year': int(fiscal_year) if fiscal_year else datetime.now().year,
            'accounting_standards': accounting_standards,
            'regulatory_framework': regulatory_framework,
            'user_id': user_id
        }
        
        # Prepare financial data
        financial_data = {
            'total_amount': float(df['amount'].sum()),
            'total_transactions': len(df),
            'category_breakdown': categorized_data.get('category_percentages', {}),
            'date_range': processed_data.get('date_range', {}),
            'processed_data': processed_data
        }
        
        # Perform AI audit
        print(f"[AUDIT] Starting audit for {company_name}")
        audit_report = audit_service.perform_audit(
            company_data=company_data,
            financial_data=financial_data,
            transactions=valid_transactions
        )
        
        # Prepare full analysis data for saving
        analysis_id = secrets.token_urlsafe(16)
        
        # Save audit to history with full visualization data
        try:
            audit_record = {
                'id': analysis_id,
                'user_id': user_id,
                'company_name': company_name,
                'audit_date': datetime.now().isoformat(),
                'audit_report': audit_report,
                'financial_summary': {
                    'total_amount': financial_data['total_amount'],
                    'total_transactions': financial_data['total_transactions']
                },
                'insights': insights,
                'visualizations': visualizations,
                'smart_score': smart_score,
                'transactions': valid_transactions[:100],  # Store sample of transactions for visualise tab
                'files_uploaded': [f.filename for f in files]
            }
            history_service.save_company_analysis(user_id, audit_record)
            print(f"[AUDIT] Saved audit to history with ID: {analysis_id}")
        except Exception as e:
            print(f"[AUDIT WARNING] Failed to save audit history: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return JSONResponse(content={
            "status": "success",
            "id": analysis_id,
            "audit_report": audit_report,
            "financial_summary": financial_data,
            "insights": insights,
            "visualizations": visualizations,
            "smart_score": smart_score,
            "transactions": valid_transactions[:100],  # Include sample for visualise tab
            "warnings": all_file_warnings,
            "errors": all_file_errors,
            "missing_values": all_missing_values,  # Detailed missing value data for table
            "message": "Audit completed successfully"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error performing audit: {str(e)}")


@app.get("/api/company/audit-history/{user_id}")
async def get_audit_history(user_id: str):
    """Get audit history for a company"""
    try:
        history = history_service.get_company_history(user_id)
        audits = [
            {
                'id': record.get('id'),
                'company_name': record.get('company_name'),
                'audit_date': record.get('audit_date'),
                'audit_summary': record.get('audit_report', {}).get('audit_summary', {}),
                'financial_summary': record.get('financial_summary', {})
            }
            for record in history if 'company_name' in record
        ]
        return JSONResponse(content={"status": "success", "audits": audits})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching audit history: {str(e)}")

@app.get("/api/company/history/{user_id}")
async def get_company_history(user_id: str):
    """Get full analysis history for a company (including visualizations)"""
    try:
        history = history_service.get_company_history(user_id)
        # Return full records for history tab
        return JSONResponse(content={"status": "success", "history": history})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

@app.get("/api/company/analysis/{analysis_id}")
async def get_company_analysis(analysis_id: str, user_id: str = None):
    """Get full analysis data by ID (for visualise tab)"""
    try:
        analysis = history_service.get_analysis_by_id(analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Verify user owns this analysis
        if user_id and analysis.get('user_id') != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return JSONResponse(content={
            "status": "success",
            "data": analysis
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analysis: {str(e)}")


@app.get("/api/company/audit-report/{audit_id}")
async def get_audit_report(audit_id: str, user_id: str = None):
    """Get detailed audit report by ID"""
    try:
        history = history_service.get_company_history(user_id) if user_id else []
        
        # Find the audit record
        audit_record = None
        for record in history:
            if record.get('id') == audit_id:
                audit_record = record
                break
        
        if not audit_record:
            raise HTTPException(status_code=404, detail="Audit report not found")
        
        return JSONResponse(content={
            "status": "success",
            "audit_report": audit_record.get('audit_report', {}),
            "metadata": {
                'id': audit_record.get('id'),
                'company_name': audit_record.get('company_name'),
                'audit_date': audit_record.get('audit_date'),
                'financial_summary': audit_record.get('financial_summary', {})
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching audit report: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
