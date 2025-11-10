# test_cover_letter_generator.py

import pytest
import os
from unittest.mock import patch, MagicMock
from utils.cover_letter_generator import (
    generate_cover_letter,
    validate_inputs,
    get_supported_tones,
    _clean_response
)

# Test data
SAMPLE_USER_INFO = {
    "name": "John Doe",
    "email": "john@example.com",
    "city": "New York",
    "postal_code": "10001",
    "country": "USA"
}

SAMPLE_JOB_POSTING = "We are looking for a skilled Python developer with experience in web development."
SAMPLE_RESUME = "John Doe\nPython Developer\n5+ years of experience"

def test_validate_inputs_valid():
    """Test input validation with valid inputs"""
    print(f"Job posting length: {len(SAMPLE_JOB_POSTING)}")
    print(f"Resume length: {len(SAMPLE_RESUME)}")
    is_valid, message = validate_inputs(SAMPLE_JOB_POSTING, SAMPLE_RESUME)
    print(f"Validation result: is_valid={is_valid}, message='{message}'")
    assert is_valid is True
    assert message == ""

def test_validate_inputs_missing_job_posting():
    """Test input validation with missing job posting"""
    is_valid, message = validate_inputs("", SAMPLE_RESUME)
    assert is_valid is False
    assert "Job posting is too short or missing" in message

def test_validate_inputs_missing_resume():
    """Test input validation with missing resume"""
    is_valid, message = validate_inputs(SAMPLE_JOB_POSTING, "")
    assert is_valid is False
    assert "Resume is too short or missing" in message

def test_get_supported_tones():
    """Test getting supported tones"""
    tones = get_supported_tones()
    assert isinstance(tones, list)
    assert len(tones) > 0
    assert "professional" in tones

@patch('utils.cover_letter_generator.model')
def test_generate_cover_letter_success(mock_model):
    """Test successful cover letter generation"""
    # Mock the Gemini model response
    mock_response = MagicMock()
    mock_response.text = "Generated cover letter content"
    mock_model.generate_content.return_value = mock_response

    # Test with minimal required fields
    result = generate_cover_letter(
        user_info=SAMPLE_USER_INFO,
        job_posting=SAMPLE_JOB_POSTING,
        resume=SAMPLE_RESUME
    )
    
    assert result == "Generated cover letter content"
    mock_model.generate_content.assert_called_once()

@patch('utils.cover_letter_generator.model')
def test_generate_cover_letter_with_optional_fields(mock_model):
    """Test cover letter generation with all optional fields"""
    mock_response = MagicMock()
    mock_response.text = "Generated formal cover letter"
    mock_model.generate_content.return_value = mock_response

    result = generate_cover_letter(
        user_info=SAMPLE_USER_INFO,
        job_posting=SAMPLE_JOB_POSTING,
        resume=SAMPLE_RESUME,
        tone="formal",
        user_prompt="Make it more technical",
        job_title="Senior Python Developer",
        company_name="Tech Corp"
    )
    
    assert result == "Generated formal cover letter"
    mock_model.generate_content.assert_called_once()

@patch.dict('os.environ', {}, clear=True)
def test_generate_cover_letter_missing_api_key():
    """Test cover letter generation when API key is missing"""
    with pytest.raises(Exception) as excinfo:
        generate_cover_letter(
            user_info=SAMPLE_USER_INFO,
            job_posting=SAMPLE_JOB_POSTING,
            resume=SAMPLE_RESUME
        )
    assert "Gemini API not configured" in str(excinfo.value)

def test_clean_response():
    """Test cleaning up the response text"""
    test_cases = [
        ("```markdown\nTest\n```", "Test"),
        ("```\nTest\n```", "Test"),
        ("  Test  ", "Test"),
        ("```Test```", "Test"),
    ]
    
    for input_text, expected in test_cases:
        assert _clean_response(input_text) == expected