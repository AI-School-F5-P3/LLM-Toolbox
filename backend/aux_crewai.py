
import os
import yaml
from crewai import Agent, Task, Crew, Process
from dotenv import load_dotenv, find_dotenv
from crewai_tools import SerperDevTool, ScrapeWebsiteTool, WebsiteSearchTool, tool

import requests

from crewai_tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type
import urllib
import yfinance as yf
from datetime import datetime

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

os.environ["SERPER_API_KEY"] = os.getenv("SERPER_API_KEY")



current_date = datetime.now().strftime("%Y-%m-%d")


# Define file paths for YAML configurations
files = {
    'agents': 'config/agents.yaml',
    'tasks': 'config/tasks.yaml'
}

# Load configurations from YAML files
configs = {}
for config_type, file_path in files.items():
    with open(file_path, 'r') as file:
        configs[config_type] = yaml.safe_load(file)

# Assign loaded configurations to specific variables
agents_config = configs['agents']
tasks_config = configs['tasks']

os.environ['OPENAI_MODEL_NAME'] = 'gpt-4o-mini'

# Creating Agents
web_search_agent = Agent(
    config=agents_config['web_search_agent'],
    tools=[SerperDevTool(), WebsiteSearchTool(), ScrapeWebsiteTool()],

)

blog_content_creator_agent = Agent(
    config=agents_config['blog_content_creator_agent'],
    #tools=[SerperDevTool(), WebsiteSearchTool()],
)

post_content_creator_agent = Agent(
    config=agents_config['post_content_creator_agent'],
    #tools=[SerperDevTool(), WebsiteSearchTool()],
)

# Creating Tasks
blog_find_data_task = Task(
    config=tasks_config['find_data'],
    agent=web_search_agent
)

blog_create_content_task = Task(
    config=tasks_config['create_content'],
    agent=blog_content_creator_agent,
    context=[blog_find_data_task]
)


# Creating Tasks
social_find_data_task = Task(
    config=tasks_config['find_data'],
    agent=web_search_agent
)

social_create_content_task = Task(
    config=tasks_config['social_create_content'],
    agent=post_content_creator_agent,
    context=[social_find_data_task]
)

# FINANCIAL NEWS

# Creating Agents
financial_search_agent = Agent(
    config=agents_config['financial_search_agent'],
    tools=[SerperDevTool(), WebsiteSearchTool(), ScrapeWebsiteTool()],

)

financial_content_creator_agent = Agent(
    config=agents_config['financial_content_creator_agent'],
   
)

# Creating Tasks
financial_find_news_task = Task(
    config=tasks_config['monitor_financial_news'],
    agent=financial_search_agent
)

financial_create_content_task = Task(
    config=tasks_config['create_financial_content'],
    agent=financial_content_creator_agent,
    context=[financial_find_news_task]
)

# Agent that use Llama3 in the Groq cloud

web_search_agent_groq = Agent(
    config=agents_config['web_search_agent_groq'],
    tools=[SerperDevTool(), WebsiteSearchTool(), ScrapeWebsiteTool()],
    llm='groq/llama-3.1-8b-instant',
    
    llm_config={
        "temperature": 0.1,
        "max_tokens": 6000,  # Adjust this to stay within rate limits
        "request_timeout": 120,  # Increase timeout to allow for rate limiting
        "max_retries": 3,  # Allow retries on rate limit errors
        "model_kwargs": {
            "stop": ["\n\n"],  # Optional: Add stop sequences to limit output
        }
    }
)



# IMAGE CREW

class LexicaSearchOutput(BaseModel):
    image_url1: str = Field(description="URL of the first image found on Lexica")
    image_url2: str = Field(description="URL of the second image found on Lexica")

class LexicaSearchInput(BaseModel):
     query: str = Field(description="The search query for Lexica")

class LexicaSearchTool(BaseTool):
    name: str = "Lexica Image Search"
    description: str = "Searches for images on Lexica.art and returns the URLs of the first two images found."
    
    args_schema: Type[BaseModel] = LexicaSearchInput
    
    return_direct: bool = True

    def _run(self, query: str) -> LexicaSearchOutput:
        encoded_query = urllib.parse.quote(query)
        url = f"https://lexica.art/api/v1/search?q={encoded_query}"

        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('images') and len(data['images']) >= 2:
                    return LexicaSearchOutput(
                        image_url1=data['images'][0]['src'],
                        image_url2=data['images'][1]['src']
                    )
                else:
                    return LexicaSearchOutput(image_url1="", image_url2="")
            else:
                raise Exception(f"Failed to retrieve data. Status code: {response.status_code}")
        except requests.RequestException as e:
            raise Exception(f"Network error occurred: {str(e)}")
        except ValueError as e:
            raise Exception(f"JSON parsing error: {str(e)}")
        except Exception as e:
            raise Exception(f"An unexpected error occurred: {str(e)}")



image_searcher = Agent(
    role="Image Searcher",
    goal="generate a sentence that is related to a context and cuse the tool to acquire images",
    backstory="An AI assistant specialized in searching for images on Lexica.art",
    tools=[LexicaSearchTool()],
    verbose=True
)

# Create a task for the agent
search_task = Task(
    description="Based on the {context} first produce a sentence in english that related to it and can be used as a prompt to generate an image via an LLM. Then use the sentence as a string input to call LexicaSearchTool",
    agent=image_searcher,
    expected_output="a list in python syntax containing two URLs of an image related to the given subject"
)


@tool
def yf_fundamental_analysis(ticker: str):
    """
    Perform comprehensive fundamental analysis on a given stock ticker.
    
    Args:
        ticker (str): The stock ticker symbol.
    
    Returns:
        dict: Comprehensive fundamental analysis results.
    """
    stock = yf.Ticker(ticker)
    info = stock.info
    financials = stock.financials
    balance_sheet = stock.balance_sheet
    cash_flow = stock.cashflow
    
    # Calculate additional financial ratios
    try:
        current_ratio = balance_sheet.loc['Total Current Assets'].iloc[-1] / balance_sheet.loc['Total Current Liabilities'].iloc[-1]
        debt_to_equity = balance_sheet.loc['Total Liabilities'].iloc[-1] / balance_sheet.loc['Total Stockholder Equity'].iloc[-1]
        roe = financials.loc['Net Income'].iloc[-1] / balance_sheet.loc['Total Stockholder Equity'].iloc[-1]
        roa = financials.loc['Net Income'].iloc[-1] / balance_sheet.loc['Total Assets'].iloc[-1]
        
        # Calculate growth rates
        revenue_growth = (financials.loc['Total Revenue'].iloc[-1] - financials.loc['Total Revenue'].iloc[-2]) / financials.loc['Total Revenue'].iloc[-2]
        net_income_growth = (financials.loc['Net Income'].iloc[-1] - financials.loc['Net Income'].iloc[-2]) / financials.loc['Net Income'].iloc[-2]
        
        # Free Cash Flow calculation
        fcf = cash_flow.loc['Operating Cash Flow'].iloc[-1] - cash_flow.loc['Capital Expenditures'].iloc[-1]
    except:
        current_ratio = debt_to_equity = roe = roa = revenue_growth = net_income_growth = fcf = None
    
    return {
        "ticker": ticker,
        "company_name": info.get('longName'),
        "sector": info.get('sector'),
        "industry": info.get('industry'),
        "market_cap": info.get('marketCap'),
        "pe_ratio": info.get('trailingPE'),
        "forward_pe": info.get('forwardPE'),
        "peg_ratio": info.get('pegRatio'),
        "price_to_book": info.get('priceToBook'),
        "dividend_yield": info.get('dividendYield'),
        "beta": info.get('beta'),
        "52_week_high": info.get('fiftyTwoWeekHigh'),
        "52_week_low": info.get('fiftyTwoWeekLow'),
        "current_ratio": current_ratio,
        "debt_to_equity": debt_to_equity,
        "return_on_equity": roe,
        "return_on_assets": roa,
        "revenue_growth": revenue_growth,
        "net_income_growth": net_income_growth,
        "free_cash_flow": fcf,
        "analyst_recommendation": info.get('recommendationKey'),
        "target_price": info.get('targetMeanPrice')
    }

# Define Agents
stock_researcher = Agent(
    role='Stock Market Researcher',
    goal='Gather and analyze comprehensive fundamental data about the stock',
    backstory="You're an experienced stock market researcher with a keen eye for detail and a talent for uncovering hidden trends.",
    tools=[yf_fundamental_analysis],
    verbose=True,
)
stock_analyst = Agent(
    role='Financial Analyst',
    goal= 'Analyze the gathered data and provide investment insights and provide a nice formatted summary report',
    backstory="You're a seasoned financial analyst known for your accurate predictions and ability to synthesize complex information.",
    verbose=True,
)
# Define Tasks
stock_research_task = Task(
    description="Research the stock {ticker} using the  tools. Provide a comprehensive summary of key metrics, including chart patterns, financial ratios, and competitor analysis.",
    agent=stock_researcher,
    expected_output="a detailed research report with key metrics and analysis"  # Added this line
)

stock_analysis_task = Task(
    description="Clearly explain the research data  for {ticker}. Conduct a thorough assessment and provide a detailed analysis of the stock's fundamentals and potential. If a metric does not have a value, omit it",
    agent=stock_analyst,
    context=[stock_research_task],
    expected_output="a nicely formatted report on the stock fundamentals and competitive landscape"
   
)

