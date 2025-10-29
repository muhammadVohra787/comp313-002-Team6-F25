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
    Removes markdown code blocks and other artifacts from AI response.
    """
    # Remove ```html or ```HTML at the start
    text = re.sub(r'^```html\s*\n?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^```\s*\n?', '', text)
    
    # Remove ``` at the end
    text = re.sub(r'\n?```\s*$', '', text)
    
    return text.strip()


def _build_prompt(
    job_posting: str,
    resume: str,
    tone: str,
    user_prompt: str,
    context: str,
    current_date: str
) -> str:
    """
    Builds the prompt for Gemini based on the parameters.
    You can modify this function to customize how prompts are structured.
    """
    
    # Tone descriptions to guide the AI
    tone_guidelines = {
        "professional": "professional, polished, and business-appropriate",
        "enthusiastic": "energetic, passionate, and showing genuine excitement for the role",
        "casual": "friendly, conversational, yet still respectful and appropriate",
        "formal": "highly formal, traditional business letter style with proper etiquette"
    }
    
    tone_description = tone_guidelines.get(tone, "professional")
    
    prompt = f"""You are an expert career coach and professional writer. Write a {tone_description} cover letter tailored to the following job posting and resume.{context}

CURRENT DATE: {current_date}

JOB POSTING:
{job_posting}

RESUME:
{resume}

Additional instructions from user:
{user_prompt if user_prompt else "None"}

IMPORTANT INSTRUCTIONS:
- Use the current date provided above ({current_date}) if you include a date
- Do NOT make up or invent dates
- The cover letter should be engaging and customized to the specific role
- Highlight the most relevant achievements from the resume
- Maintain a {tone_description} tone throughout
- Follow standard business letter formatting
- Be concise but impactful (aim for 3-4 paragraphs)
- Include a strong opening that captures attention
- Connect specific resume experience to job requirements
- End with a clear call to action
- Format the response as clean HTML with proper paragraphs using <p> tags
- Do NOT wrap your response in markdown code blocks (no ```html or ```)
- Return ONLY the HTML content, nothing else

Format the response as clean HTML that can be directly rendered in a web page."""
    
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