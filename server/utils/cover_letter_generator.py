"""
Cover Letter Generation Utility
Handles AI-powered cover letter generation using Google Gemini API
"""

import google.generativeai as genai
import os
import re
from datetime import datetime

# Initialize Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash-exp")
else:
    model = None
    print("WARNING: GEMINI_API_KEY not set - cover letter generation will fail")


def generate_cover_letter(
    user_info: dict,
    job_posting: str,
    resume: str,
    tone: str = "professional",
    user_prompt: str = "",
    job_title: str = None,
    company_name: str = None
) -> str:
    """
    Generates an AI-powered cover letter using Gemini.
    
    Args:
        job_posting (str): Cleaned job description text
        resume (str): User's resume text
        tone (str): Tone of the cover letter (professional, enthusiastic, casual, formal)
        user_prompt (str): Additional instructions from the user
        job_title (str, optional): Job title for more context
        company_name (str, optional): Company name for more context
    
    Returns:
        str: Generated cover letter in HTML format
        
    Raises:
        Exception: If Gemini API is not configured or generation fails
    """
    if not model:
        raise Exception("Gemini API not configured. Please set GEMINI_API_KEY environment variable.")
    
    # Build context string if we have job title or company
    context = ""
    if job_title or company_name:
        context = "\n\nJob Context:"
        if job_title:
            context += f"\n- Position: {job_title}"
        if company_name:
            context += f"\n- Company: {company_name}"
    
    # Get current date
    current_date = datetime.now().strftime("%B %d, %Y")
    
    # Build the prompt
    prompt = _build_prompt(
        user_info=user_info,
        job_posting=job_posting,
        resume=resume,
        tone=tone,
        user_prompt=user_prompt,
        context=context,
        current_date=current_date
    )
    
    try:
        response = model.generate_content(prompt)
        generated_text = response.text.strip()
        
        # Clean up the response (remove markdown code blocks if present)
        generated_text = _clean_response(generated_text)
        
        return generated_text
    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}")


def _clean_response(text: str) -> str:
    """
    Removes unwanted code fences or extra whitespace without breaking Markdown structure.
    """
    # Remove ``` and ```markdown fences
    text = text.replace("```markdown", "").replace("```md", "").replace("```", "")
    
    # Trim leading/trailing whitespace
    text = text.strip()
    
    return text



def _build_prompt(
    job_posting: str,
    user_info: dict,
    resume: str,
    tone: str,
    user_prompt: str,
    context: str,
    current_date: str
) -> str:
    """
    Builds a clean, consistent Markdown prompt for Gemini.
    The output will always follow a fixed structure.
    """

    tone_guidelines = {
        "professional": "professional and polished",
        "enthusiastic": "positive and energetic",
        "casual": "friendly yet respectful",
        "formal": "highly formal and traditional"
    }

    tone_description = tone_guidelines.get(tone, "professional")

    prompt = f"""
    You are an expert career writer. Write a professional cover letter in **Markdown format** following the exact structure below. Do not change the structure, only fill in content based on the resume and job posting.

    Use this structure exactly:

    [Full Name]
    [City, Province/ Country (guess if not provided), Postal Code (optional)]  
    [Only one contact: Email if available, otherwise Phone, otherwise LinkedIn]  
    {current_date}

    [Specific name if provided of the Hiring Manager, otherwise use Hiring Manager]  
    [Company Name]  
    [Company Address if provided]  
    [City, Province/ Country if provided]  

    Dear [Specific name if provided of the Hiring Manager, otherwise use Hiring Manager],

    [Opening paragraph: 3-4 sentences. Mention your strong foundation in relevant skills and your excitement for the role at this company.]

    [Second paragraph: Summarize your most relevant achievements and experience that directly match the job requirements. Include quantifiable results if possible.]

    [Third paragraph: Explain why you are interested in the company and how your skills, experience, and values align with their mission and culture.]

    [Final paragraph: Polite closing with a call to action.]

    Sincerely,  
    [Full Name]

    ---

    JOB POSTING:
    {job_posting}

    USER INFO:
    {{
        "name": "{user_info['name']}",
        "email": "{user_info['email']}",
        "city": "{user_info['city']}",
        "postal_code": "{user_info['postal_code']}",
        "country": "{user_info['country']}"
    }}

    RESUME:
    {resume}

    Additional instructions (if any):
    {user_prompt if user_prompt else "None"}
    {tone_description}

    Notes:
    - Never add or remove sections.
    - Do not include extra formatting, code blocks, or HTML.
    - Keep it concise (3–4 paragraphs).
    - Never repeat contact info at the bottom.
    - Use natural, professional language suitable for an entry-level software developer position.
    """


    return prompt


def validate_inputs(job_posting: str, resume: str) -> tuple[bool, str]:
    """
    Validates that required inputs are present and reasonable.
    
    Args:
        job_posting (str): Job description text
        resume (str): Resume text
        
    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not job_posting or len(job_posting.strip()) < 50:
        return False, "Job posting is too short or missing. Please provide a valid job description."
    
    if not resume or len(resume.strip()) < 100:
        return False, "Resume is too short or missing. Please upload a valid resume."
    
    if len(job_posting) > 50000:
        return False, "Job posting is too long. Please provide a shorter description."
    
    if len(resume) > 50000:
        return False, "Resume is too long. Please provide a more concise resume."
    
    return True, ""


def get_supported_tones() -> list[str]:
    """
    Returns a list of supported tone options.
    Useful for frontend validation or API documentation.
    """
    return ["professional", "enthusiastic", "casual", "formal"]