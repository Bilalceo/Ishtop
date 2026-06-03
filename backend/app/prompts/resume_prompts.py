"""
=============================================================================
RESUME GENERATION PROMPT TEMPLATES
=============================================================================

This file contains all prompt templates for AI resume generation.
Prompts are the instructions we send to GPT-4 to generate content.

WHY USE PROMPT TEMPLATES?
1. Consistency - Same format every time
2. Maintainability - Update prompts in one place
3. Testability - Easy to test different prompts
4. Reusability - Use across different features

PROMPT ENGINEERING TIPS:
- Be specific and detailed in instructions
- Provide examples when possible
- Define the exact output format expected
- Use system messages for role/persona
- Set constraints to prevent unwanted output

USAGE:
    from app.prompts.resume_prompts import ResumePromptTemplate
    
    template = ResumePromptTemplate()
    prompt = template.get_generation_prompt(
        job_title="Software Engineer",
        years_experience=5,
        skills=["Python", "React"]
    )
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum


# =============================================================================
# ENUMS FOR TYPE SAFETY
# =============================================================================

class ResumeTone(str, Enum):
    """Available writing tones for resume generation."""
    PROFESSIONAL = "professional"
    CREATIVE = "creative"
    TECHNICAL = "technical"
    EXECUTIVE = "executive"
    ENTRY_LEVEL = "entry_level"


class ExperienceLevel(str, Enum):
    """Experience levels for tailoring content."""
    ENTRY = "entry"        # 0-2 years
    MID = "mid"            # 3-5 years
    SENIOR = "senior"      # 6-10 years
    LEAD = "lead"          # 10-15 years
    EXECUTIVE = "executive" # 15+ years


# =============================================================================
# JSON OUTPUT SCHEMA
# =============================================================================
# This defines the exact structure we want GPT-4 to return

RESUME_JSON_SCHEMA = '''
{
    "professional_summary": {
        "text": "A compelling 3-4 sentence professional summary that highlights key strengths, years of experience, and career objectives. Should be tailored to the target role.",
        "keywords": ["keyword1", "keyword2", "..."]
    },
    
    "work_experience": [
        {
            "job_title": "Your job title",
            "company_name": "Company Name",
            "company_description": "Brief description of the company (optional)",
            "location": "City, State/Country",
            "employment_type": "Full-time/Part-time/Contract",
            "start_date": "Month Year (e.g., January 2020)",
            "end_date": "Month Year or Present",
            "is_current": true/false,
            "responsibilities": [
                "Key responsibility or duty 1",
                "Key responsibility or duty 2"
            ],
            "achievements": [
                {
                    "description": "Specific achievement with context",
                    "metric": "Quantifiable result (e.g., 'increased sales by 25%')",
                    "impact": "Business impact of this achievement"
                }
            ],
            "technologies_used": ["Tech1", "Tech2"],
            "key_projects": [
                {
                    "name": "Project name",
                    "description": "What you did",
                    "outcome": "Result achieved"
                }
            ]
        }
    ],
    
    "skills": {
        "technical_skills": [
            {
                "category": "Category name (e.g., Programming Languages)",
                "skills": [
                    {
                        "name": "Skill name",
                        "proficiency": "Expert/Advanced/Intermediate/Beginner",
                        "years_experience": 5
                    }
                ]
            }
        ],
        "soft_skills": [
            {
                "name": "Skill name (e.g., Leadership)",
                "description": "How you've demonstrated this skill"
            }
        ],
        "certifications": [
            {
                "name": "Certification name",
                "issuing_organization": "Organization",
                "date_obtained": "Month Year",
                "expiry_date": "Month Year or 'No Expiration'",
                "credential_id": "ID if applicable"
            }
        ],
        "languages": [
            {
                "language": "Language name",
                "proficiency": "Native/Fluent/Professional/Conversational"
            }
        ]
    },
    
    "education": [
        {
            "degree_type": "Bachelor's/Master's/PhD/etc.",
            "field_of_study": "Major or field",
            "institution_name": "University/College name",
            "institution_location": "City, State/Country",
            "graduation_date": "Month Year",
            "gpa": "GPA if notable (3.5+)",
            "honors": ["Honor 1", "Honor 2"],
            "relevant_coursework": ["Course 1", "Course 2"],
            "activities": ["Activity 1", "Activity 2"],
            "thesis_project": {
                "title": "Thesis/Capstone title if applicable",
                "description": "Brief description"
            }
        }
    ],
    
    "additional_sections": {
        "projects": [
            {
                "name": "Project name",
                "description": "What the project does",
                "role": "Your role in the project",
                "technologies": ["Tech1", "Tech2"],
                "url": "GitHub/live URL if applicable",
                "highlights": ["Key achievement 1", "Key achievement 2"]
            }
        ],
        "publications": [
            {
                "title": "Publication title",
                "publication_venue": "Journal/Conference name",
                "date": "Year",
                "url": "Link if available"
            }
        ],
        "awards": [
            {
                "name": "Award name",
                "issuer": "Issuing organization",
                "date": "Year",
                "description": "Why you received it"
            }
        ],
        "volunteer_experience": [
            {
                "organization": "Organization name",
                "role": "Your role",
                "duration": "Time period",
                "description": "What you did"
            }
        ]
    },
    
    "metadata": {
        "generated_for_role": "Target job title",
        "ats_optimized": true,
        "keywords_included": ["keyword1", "keyword2"],
        "estimated_read_time": "30 seconds",
        "word_count": 500
    }
}
'''


# =============================================================================
# PROMPT TEMPLATE CLASS
# =============================================================================

@dataclass
class ResumePromptTemplate:
    """
    Manages all prompt templates for resume generation.
    
    This class provides methods to generate prompts for different
    resume-related AI tasks. Each method returns a fully formatted
    prompt ready to send to GPT-4.
    
    USAGE:
        template = ResumePromptTemplate()
        
        # Get the system message (defines AI's role)
        system_msg = template.get_system_message()
        
        # Get the user prompt for generation
        user_prompt = template.get_generation_prompt(
            job_title="Software Engineer",
            years_experience=5,
            skills=["Python", "JavaScript"]
        )
    """
    
    # -------------------------------------------------------------------------
    # SYSTEM MESSAGES
    # -------------------------------------------------------------------------
    # System messages define the AI's role and behavior
    
    def get_system_message(self, tone: ResumeTone = ResumeTone.PROFESSIONAL) -> str:
        """
        Get the system message that defines the AI's role.
        
        The system message is crucial - it sets the AI's persona and
        establishes the context for all subsequent interactions.
        
        Args:
            tone: The writing style to use
            
        Returns:
            System message string
        """
        
        tone_descriptions = {
            ResumeTone.PROFESSIONAL: "formal, polished, and business-appropriate",
            ResumeTone.CREATIVE: "innovative, unique, and attention-grabbing while remaining professional",
            ResumeTone.TECHNICAL: "precise, detailed, and focused on technical achievements",
            ResumeTone.EXECUTIVE: "strategic, leadership-focused, and emphasizing business impact",
            ResumeTone.ENTRY_LEVEL: "enthusiastic, potential-focused, and highlighting transferable skills"
        }
        
        return f"""You are an expert professional resume writer with over 20 years of experience.

YOUR EXPERTISE:
- Certified Professional Resume Writer (CPRW)
- Expert in Applicant Tracking Systems (ATS) optimization
- Specialist in career transitions and personal branding
- Knowledge of hiring practices across all major industries

YOUR WRITING STYLE:
- {tone_descriptions.get(tone, tone_descriptions[ResumeTone.PROFESSIONAL])}
- Always uses strong action verbs (Led, Developed, Achieved, Optimized, etc.)
- Focuses on quantifiable achievements and measurable results
- Writes concise, impactful bullet points
- Avoids clichés and generic phrases

YOUR RULES:
1. ALWAYS return valid JSON matching the specified schema
2. NEVER include placeholder text like "Lorem ipsum" or "[Insert here]"
3. Make ALL content realistic, specific, and believable
4. Include specific metrics and numbers in achievements (e.g., "increased revenue by 35%")
5. Tailor content specifically to the target role
6. Ensure ATS compatibility by using standard section headers and keywords
7. Match experience level to years of experience provided
8. Use industry-appropriate terminology
9. Never fabricate company names that are real - use realistic fictional names
10. Maintain consistent formatting throughout

RESPONSE FORMAT:
- Return ONLY valid JSON
- No markdown formatting
- No additional explanations
- No text before or after the JSON"""
    
    # -------------------------------------------------------------------------
    # MAIN GENERATION PROMPT
    # -------------------------------------------------------------------------
    
    def get_generation_prompt(
        self,
        job_title: str,
        years_experience: int,
        skills: List[str],
        education_level: str = "Bachelor's",
        field_of_study: Optional[str] = None,
        industry: Optional[str] = None,
        target_company: Optional[str] = None,
        job_description: Optional[str] = None,
        include_projects: bool = True,
        include_certifications: bool = True,
        career_highlights: Optional[List[str]] = None,
        preferred_companies: Optional[List[str]] = None,
        location_preference: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> str:
        """
        Generate the main prompt for resume creation.
        
        This is the primary method for creating a complete resume.
        It builds a detailed prompt that guides GPT-4 to generate
        realistic, tailored resume content.
        
        Args:
            job_title: Target job title (e.g., "Senior Software Engineer")
            years_experience: Total years of professional experience
            skills: List of key skills to highlight
            education_level: Highest degree obtained
            field_of_study: Major or area of study
            industry: Target industry (e.g., "Technology", "Finance")
            target_company: Specific company applying to (for tailoring)
            job_description: Full job description (for keyword optimization)
            include_projects: Whether to include a projects section
            include_certifications: Whether to include certifications
            career_highlights: Specific achievements to emphasize
            preferred_companies: Companies in career history style
            location_preference: Geographic location context
            additional_context: Any extra information to consider
            
        Returns:
            Formatted prompt string ready for GPT-4
            
        Example:
            prompt = template.get_generation_prompt(
                job_title="Data Scientist",
                years_experience=4,
                skills=["Python", "Machine Learning", "SQL", "TensorFlow"],
                education_level="Master's",
                field_of_study="Computer Science",
                industry="Technology",
                target_company="Google"
            )
        """
        
        # Determine experience level based on years
        if years_experience <= 2:
            exp_level = ExperienceLevel.ENTRY
            num_jobs = 1
        elif years_experience <= 5:
            exp_level = ExperienceLevel.MID
            num_jobs = 2
        elif years_experience <= 10:
            exp_level = ExperienceLevel.SENIOR
            num_jobs = 3
        elif years_experience <= 15:
            exp_level = ExperienceLevel.LEAD
            num_jobs = 4
        else:
            exp_level = ExperienceLevel.EXECUTIVE
            num_jobs = 5
        
        # Build the prompt sections
        prompt_parts = []
        
        # =====================================================================
        # SECTION 1: TASK DESCRIPTION
        # =====================================================================
        prompt_parts.append(f"""
# RESUME GENERATION TASK

Generate a complete, professional resume for the following candidate profile.
The resume should be realistic, achievement-focused, and optimized for ATS systems.

## CANDIDATE PROFILE
""")
        
        # =====================================================================
        # SECTION 2: CANDIDATE DETAILS
        # =====================================================================
        prompt_parts.append(f"""
### Basic Information
- **Target Position:** {job_title}
- **Years of Experience:** {years_experience} years
- **Experience Level:** {exp_level.value.replace('_', ' ').title()}
- **Education Level:** {education_level}
- **Field of Study:** {field_of_study or "Related field"}
- **Industry:** {industry or "Not specified - use most relevant"}
- **Location:** {location_preference or "United States"}
""")
        
        # =====================================================================
        # SECTION 3: SKILLS
        # =====================================================================
        prompt_parts.append(f"""
### Core Skills to Highlight
{chr(10).join(f'- {skill}' for skill in skills)}

**Note:** Include these skills prominently, and add related/complementary skills that would be expected for this role.
""")
        
        # =====================================================================
        # SECTION 4: TARGET COMPANY (if provided)
        # =====================================================================
        if target_company:
            prompt_parts.append(f"""
### Target Company
This resume is being tailored for: **{target_company}**

Consider the company's:
- Industry and culture
- Known values and mission
- Types of projects they work on
- Technology stack (if tech company)
""")
        
        # =====================================================================
        # SECTION 5: JOB DESCRIPTION (if provided)
        # =====================================================================
        if job_description:
            prompt_parts.append(f"""
### Target Job Description
Tailor the resume specifically to this job posting:

---
{job_description}
---

**Important:** 
- Extract and use keywords from this job description
- Match required qualifications with candidate experience
- Emphasize relevant achievements that align with job requirements
""")
        
        # =====================================================================
        # SECTION 6: CAREER HIGHLIGHTS (if provided)
        # =====================================================================
        if career_highlights:
            prompt_parts.append(f"""
### Career Highlights to Emphasize
Include these specific achievements in the work experience:
{chr(10).join(f'- {highlight}' for highlight in career_highlights)}
""")
        
        # =====================================================================
        # SECTION 7: ADDITIONAL CONTEXT (if provided)
        # =====================================================================
        if additional_context:
            prompt_parts.append(f"""
### Additional Context
{additional_context}
""")
        
        # =====================================================================
        # SECTION 8: GENERATION REQUIREMENTS
        # =====================================================================
        prompt_parts.append(f"""
## GENERATION REQUIREMENTS

### Work Experience Requirements
1. Generate exactly **{num_jobs} positions** showing career progression
2. Most recent position should be closest to the target role
3. Each position should have:
   - 3-5 responsibility bullet points
   - 2-4 quantifiable achievements with specific metrics
   - Relevant technologies/tools used
4. Show logical career progression
5. Use realistic company names (fictional but believable)
6. Include a mix of company sizes if appropriate

### Professional Summary Requirements
1. 3-4 impactful sentences
2. Lead with years of experience and expertise area
3. Highlight 2-3 key strengths
4. Include a career objective aligned with target role
5. Use keywords from the target job description

### Skills Section Requirements
1. Organize into logical categories (e.g., Programming, Tools, Soft Skills)
2. Include proficiency levels for technical skills
3. Prioritize skills mentioned in job description
4. Include both hard and soft skills
5. Add relevant certifications if applicable

### Education Requirements
1. Include {education_level} degree in {field_of_study or "relevant field"}
2. Add honors/GPA if impressive (3.5+)
3. Include relevant coursework for recent graduates
4. Add any relevant academic projects or research
""")
        
        # =====================================================================
        # SECTION 9: OPTIONAL SECTIONS
        # =====================================================================
        if include_projects:
            prompt_parts.append("""
### Projects Section
Include 2-3 relevant projects that demonstrate:
- Technical skills in action
- Problem-solving ability
- Initiative and creativity
- Real-world impact
""")
        
        if include_certifications:
            prompt_parts.append("""
### Certifications
Include 2-3 relevant industry certifications that:
- Are recognized in the industry
- Align with the target role
- Are current and valid
""")
        
        # =====================================================================
        # SECTION 10: OUTPUT FORMAT
        # =====================================================================
        prompt_parts.append(f"""
## OUTPUT FORMAT

Return a JSON object with the following structure:

{RESUME_JSON_SCHEMA}

## FINAL CHECKLIST
Before returning, verify:
✓ All dates are consistent and logical
✓ Career progression makes sense
✓ Achievements include specific numbers/metrics
✓ No placeholder or generic text
✓ JSON is valid and complete
✓ Content matches the specified years of experience
✓ Keywords from job description are included
✓ All sections are filled with realistic content

**Return ONLY the JSON object. No other text.**
""")
        
        return "\n".join(prompt_parts)
    
    # -------------------------------------------------------------------------
    # SECTION-SPECIFIC PROMPTS
    # -------------------------------------------------------------------------
    
    def get_summary_prompt(
        self,
        job_title: str,
        years_experience: int,
        key_skills: List[str],
        key_achievements: Optional[List[str]] = None
    ) -> str:
        """
        Generate a prompt for creating just the professional summary.
        
        Use this when you only need to generate or regenerate
        the summary section of a resume.
        
        Args:
            job_title: Target job title
            years_experience: Years of experience
            key_skills: Top skills to highlight
            key_achievements: Notable achievements to mention
            
        Returns:
            Prompt for summary generation
        """
        achievements_text = ""
        if key_achievements:
            achievements_text = f"""
Key Achievements to Mention:
{chr(10).join(f'- {achievement}' for achievement in key_achievements)}
"""
        
        return f"""
Generate a compelling professional summary for a resume.

PROFILE:
- Target Role: {job_title}
- Experience: {years_experience} years
- Key Skills: {', '.join(key_skills)}
{achievements_text}

REQUIREMENTS:
1. Write exactly 3-4 impactful sentences
2. Start with years of experience and expertise area
3. Highlight top 2-3 skills
4. Include a quantifiable achievement if possible
5. End with career objective or value proposition
6. Use strong action words
7. Avoid clichés like "results-driven" or "team player"

Return JSON:
{{
    "professional_summary": {{
        "text": "The summary text here...",
        "keywords": ["keyword1", "keyword2", ...]
    }}
}}
"""
    
    def get_work_experience_prompt(
        self,
        job_title: str,
        company_type: str,
        duration_months: int,
        skills_used: List[str],
        is_current: bool = False
    ) -> str:
        """
        Generate a prompt for creating a single work experience entry.
        
        Use this when adding or regenerating individual positions.
        
        Args:
            job_title: Position title
            company_type: Type of company (startup, enterprise, agency, etc.)
            duration_months: How long in this position
            skills_used: Technologies/skills used in this role
            is_current: Whether this is the current position
            
        Returns:
            Prompt for work experience generation
        """
        return f"""
Generate a detailed work experience entry for a resume.

POSITION DETAILS:
- Job Title: {job_title}
- Company Type: {company_type}
- Duration: {duration_months} months
- Current Position: {is_current}
- Skills/Technologies: {', '.join(skills_used)}

REQUIREMENTS:
1. Create a realistic fictional company name appropriate for the company type
2. Generate 4-5 responsibility bullet points
3. Include 3-4 quantifiable achievements with specific metrics
4. Use strong action verbs (Led, Developed, Implemented, etc.)
5. Make achievements specific and measurable
6. Include relevant technologies in context

Return JSON:
{{
    "work_experience": {{
        "job_title": "{job_title}",
        "company_name": "Generated company name",
        "company_description": "Brief description",
        "location": "City, State",
        "employment_type": "Full-time",
        "start_date": "Month Year",
        "end_date": "{'Present' if is_current else 'Month Year'}",
        "is_current": {str(is_current).lower()},
        "responsibilities": ["...", "..."],
        "achievements": [
            {{
                "description": "...",
                "metric": "...",
                "impact": "..."
            }}
        ],
        "technologies_used": {skills_used},
        "key_projects": [...]
    }}
}}
"""
    
    def get_skills_prompt(
        self,
        primary_skills: List[str],
        years_experience: int,
        industry: str
    ) -> str:
        """
        Generate a prompt for creating the skills section.
        
        Args:
            primary_skills: Core skills to include
            years_experience: Total experience (affects skill levels)
            industry: Industry for context
            
        Returns:
            Prompt for skills section generation
        """
        return f"""
Generate a comprehensive skills section for a resume.

INPUT:
- Primary Skills: {', '.join(primary_skills)}
- Years of Experience: {years_experience}
- Industry: {industry}

REQUIREMENTS:
1. Organize skills into logical categories
2. Assign appropriate proficiency levels based on experience
3. Add complementary skills that would be expected
4. Include soft skills relevant to the industry
5. Add 2-3 relevant certifications
6. Include language proficiencies if relevant

Proficiency Guidelines based on experience:
- 0-1 years: Beginner
- 1-3 years: Intermediate
- 3-5 years: Advanced
- 5+ years: Expert

Return JSON:
{{
    "skills": {{
        "technical_skills": [
            {{
                "category": "Category Name",
                "skills": [
                    {{
                        "name": "Skill",
                        "proficiency": "Level",
                        "years_experience": X
                    }}
                ]
            }}
        ],
        "soft_skills": [
            {{
                "name": "Skill",
                "description": "How demonstrated"
            }}
        ],
        "certifications": [...],
        "languages": [...]
    }}
}}
"""
    
    def get_education_prompt(
        self,
        degree_level: str,
        field_of_study: str,
        graduation_year: Optional[int] = None,
        include_details: bool = True
    ) -> str:
        """
        Generate a prompt for creating the education section.
        
        Args:
            degree_level: Type of degree
            field_of_study: Major/field
            graduation_year: Year of graduation
            include_details: Whether to include coursework, activities, etc.
            
        Returns:
            Prompt for education section generation
        """
        details_instruction = ""
        if include_details:
            details_instruction = """
Include:
- Relevant coursework (4-6 courses)
- Academic honors/awards
- Extracurricular activities
- Thesis/capstone project if applicable
"""
        
        return f"""
Generate an education section for a resume.

DETAILS:
- Degree Level: {degree_level}
- Field of Study: {field_of_study}
- Graduation Year: {graduation_year or "Recent"}

REQUIREMENTS:
1. Create a realistic fictional university name
2. Include appropriate location
3. Add GPA if impressive (3.5+)
{details_instruction}

Return JSON:
{{
    "education": [
        {{
            "degree_type": "{degree_level}",
            "field_of_study": "{field_of_study}",
            "institution_name": "University name",
            "institution_location": "City, State",
            "graduation_date": "Month Year",
            "gpa": "X.XX",
            "honors": [...],
            "relevant_coursework": [...],
            "activities": [...],
            "thesis_project": {{...}}
        }}
    ]
}}
"""


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_action_verbs_by_category() -> Dict[str, List[str]]:
    """
    Get a dictionary of strong action verbs organized by category.
    
    These can be used to improve resume bullet points.
    
    Returns:
        Dictionary with categories as keys and verb lists as values
    """
    return {
        "leadership": [
            "Led", "Directed", "Managed", "Supervised", "Coordinated",
            "Orchestrated", "Spearheaded", "Chaired", "Headed", "Oversaw"
        ],
        "achievement": [
            "Achieved", "Exceeded", "Outperformed", "Surpassed", "Accomplished",
            "Attained", "Delivered", "Succeeded", "Won", "Earned"
        ],
        "creation": [
            "Created", "Developed", "Designed", "Built", "Established",
            "Launched", "Introduced", "Pioneered", "Initiated", "Founded"
        ],
        "improvement": [
            "Improved", "Enhanced", "Optimized", "Streamlined", "Accelerated",
            "Increased", "Boosted", "Strengthened", "Transformed", "Revitalized"
        ],
        "analysis": [
            "Analyzed", "Evaluated", "Assessed", "Researched", "Investigated",
            "Examined", "Studied", "Reviewed", "Audited", "Diagnosed"
        ],
        "communication": [
            "Presented", "Communicated", "Negotiated", "Persuaded", "Influenced",
            "Collaborated", "Partnered", "Liaised", "Advocated", "Articulated"
        ],
        "technical": [
            "Implemented", "Engineered", "Programmed", "Automated", "Integrated",
            "Configured", "Deployed", "Architected", "Debugged", "Refactored"
        ]
    }


def get_industry_keywords(industry: str) -> List[str]:
    """
    Get common keywords for specific industries.
    
    These help with ATS optimization.
    
    Args:
        industry: Industry name
        
    Returns:
        List of relevant keywords
    """
    keywords = {
        "technology": [
            "Agile", "Scrum", "CI/CD", "Cloud", "DevOps", "Microservices",
            "API", "Full-stack", "Scalability", "Performance", "Security"
        ],
        "finance": [
            "Financial Analysis", "Risk Management", "Compliance", "Portfolio",
            "Investment", "Regulatory", "Due Diligence", "Valuation", "Audit"
        ],
        "healthcare": [
            "Patient Care", "HIPAA", "Clinical", "EMR", "Healthcare IT",
            "Medical", "Compliance", "Quality Assurance", "Patient Safety"
        ],
        "marketing": [
            "Digital Marketing", "SEO", "SEM", "Content Strategy", "Analytics",
            "Brand Management", "Campaign", "ROI", "Lead Generation", "CRM"
        ],
        "sales": [
            "Revenue Growth", "Client Acquisition", "Pipeline", "CRM",
            "Negotiation", "Account Management", "Quota", "Territory", "B2B"
        ]
    }
    
    return keywords.get(industry.lower(), [])
























