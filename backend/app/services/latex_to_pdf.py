"""LaTeX to PDF conversion service using online API."""
import httpx
import json
from typing import Optional


def compile_latex_to_pdf(latex_content: str, template_dir=None) -> Optional[bytes]:
    """
    Compile LaTeX content to PDF using online LaTeX compilation API.
    
    Uses latex.ytotech.com - a free online LaTeX compiler.
    
    Args:
        latex_content: The LaTeX code as a string
        template_dir: Not used (kept for API compatibility)
        
    Returns:
        PDF bytes if successful, None otherwise
    """
    # #region agent log
    log_data = {
        "location": "latex_to_pdf.py:20", 
        "message": "compile_latex_to_pdf entry (online API)", 
        "data": {"latex_length": len(latex_content)}, 
        "timestamp": int(__import__('time').time() * 1000), 
        "sessionId": "debug-session", 
        "runId": "run5", 
        "hypothesisId": "H"
    }
    try:
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
    except:
        pass
    # #endregion
    
    # Try multiple online LaTeX compilation services
    services = [
        _compile_with_latexonline,
        _compile_with_ytotech,
    ]
    
    for service in services:
        try:
            result = service(latex_content)
            if result:
                # #region agent log
                log_data = {
                    "location": "latex_to_pdf.py:45", 
                    "message": "PDF compiled successfully", 
                    "data": {"pdf_size": len(result), "service": service.__name__}, 
                    "timestamp": int(__import__('time').time() * 1000), 
                    "sessionId": "debug-session", 
                    "runId": "run5", 
                    "hypothesisId": "H"
                }
                try:
                    with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except:
                    pass
                # #endregion
                return result
        except Exception as e:
            print(f"Service {service.__name__} failed: {e}")
            continue
    
    # #region agent log
    log_data = {
        "location": "latex_to_pdf.py:60", 
        "message": "All compilation services failed", 
        "data": {}, 
        "timestamp": int(__import__('time').time() * 1000), 
        "sessionId": "debug-session", 
        "runId": "run5", 
        "hypothesisId": "H"
    }
    try:
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
    except:
        pass
    # #endregion
    
    return None


def _compile_with_latexonline(latex_content: str) -> Optional[bytes]:
    """
    Compile using latexonline.cc API.
    
    This is a free service that compiles LaTeX to PDF.
    """
    url = "https://latexonline.cc/compile"
    
    # #region agent log
    log_data = {
        "location": "latex_to_pdf.py:85", 
        "message": "Trying latexonline.cc", 
        "data": {"url": url}, 
        "timestamp": int(__import__('time').time() * 1000), 
        "sessionId": "debug-session", 
        "runId": "run5", 
        "hypothesisId": "H"
    }
    try:
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
    except:
        pass
    # #endregion
    
    try:
        with httpx.Client(timeout=60.0) as client:
            # latexonline.cc accepts text parameter with LaTeX content
            response = client.post(
                url,
                data={"text": latex_content},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            # #region agent log
            log_data = {
                "location": "latex_to_pdf.py:105", 
                "message": "latexonline.cc response", 
                "data": {
                    "status_code": response.status_code, 
                    "content_type": response.headers.get("content-type", ""),
                    "content_length": len(response.content)
                }, 
                "timestamp": int(__import__('time').time() * 1000), 
                "sessionId": "debug-session", 
                "runId": "run5", 
                "hypothesisId": "H"
            }
            try:
                with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except:
                pass
            # #endregion
            
            if response.status_code == 200 and response.headers.get("content-type", "").startswith("application/pdf"):
                return response.content
            else:
                print(f"latexonline.cc failed: {response.status_code}")
                if len(response.content) < 1000:
                    print(f"Response: {response.text}")
                return None
                
    except Exception as e:
        print(f"latexonline.cc error: {e}")
        return None


def _compile_with_ytotech(latex_content: str) -> Optional[bytes]:
    """
    Compile using latex.ytotech.com API.
    
    Free online LaTeX compiler with JSON API.
    """
    url = "https://latex.ytotech.com/builds/sync"
    
    # #region agent log
    log_data = {
        "location": "latex_to_pdf.py:140", 
        "message": "Trying latex.ytotech.com", 
        "data": {"url": url}, 
        "timestamp": int(__import__('time').time() * 1000), 
        "sessionId": "debug-session", 
        "runId": "run5", 
        "hypothesisId": "H"
    }
    try:
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
    except:
        pass
    # #endregion
    
    try:
        payload = {
            "compiler": "pdflatex",
            "resources": [
                {
                    "main": True,
                    "content": latex_content
                }
            ]
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            # #region agent log
            log_data = {
                "location": "latex_to_pdf.py:170", 
                "message": "ytotech response", 
                "data": {
                    "status_code": response.status_code, 
                    "content_type": response.headers.get("content-type", ""),
                    "content_length": len(response.content)
                }, 
                "timestamp": int(__import__('time').time() * 1000), 
                "sessionId": "debug-session", 
                "runId": "run5", 
                "hypothesisId": "H"
            }
            try:
                with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except:
                pass
            # #endregion
            
            if response.status_code == 201 and response.headers.get("content-type", "").startswith("application/pdf"):
                return response.content
            else:
                print(f"ytotech failed: {response.status_code}")
                if len(response.content) < 1000:
                    print(f"Response: {response.text}")
                return None
                
    except Exception as e:
        print(f"ytotech error: {e}")
        return None
