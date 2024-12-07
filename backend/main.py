from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Dict, Optional, Any, Optional
import json
from enum import Enum
from datetime import datetime
import os
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import re
from pathlib import Path
import pandas as pd
import markdown
from fastapi.staticfiles import StaticFiles
import traceback
import logging

import yfinance as yf
import pandas_ta as ta
import matplotlib.pyplot as plt

from aux_crewai import *
from aux_scientific import *






app = FastAPI(title="LLM Toolbox",
             description="A web application to Generate Content Using LLMs",
             version="1.0.0")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class ModRequest(BaseModel):
    model_name: str

class ModResponse(BaseModel):
    status: str
    message: str


# Add this new model class for the blog request
class BlogRequest(BaseModel):
    content: str

class BlogResponse(BaseModel):
    message: str

class PostRequest(BaseModel):
    content: str

class PostResponse(BaseModel):
    message: str

class ImageRequest(BaseModel):
    content: str

class ImageResponse(BaseModel):
    message: str


# Mount the images directory to make it accessible via HTTP
#app.mount("/images", StaticFiles(directory="images"), name="images")

# New models for ArXiv endpoints
class ArxivSearchRequest(BaseModel):
    query: str
    max_results: int = 10

class PaperInfo(BaseModel):
    title: str
    filename: str

class PaperSearchResponse(BaseModel):
    papers: List[PaperInfo]

class PaperProcessRequest(BaseModel):
    filenames: List[str]

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

# Request and Response Models
class NewsRequest(BaseModel):
    sector_or_country: str

class NewsResponse(BaseModel):
    news: str

class FundamentalRequest(BaseModel):
    ticker: str

class FundamentalResponse(BaseModel):
    analysis: str  # This is the required field


class Period(str, Enum):
    ONE_YEAR = "1year"

class ChartRequest(BaseModel):
    ticker: str
    period: Period = Period.ONE_YEAR
    
    @field_validator('ticker')
    def validate_ticker(cls, v):
        v = v.strip().upper()
        if not v:
            raise ValueError("Ticker symbol cannot be empty")
        return v

class ChartResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    error: Optional[str] = None


def generate_ta_chart(ticker, period='1y', save_path='charts'):
    """
    Generate and save a technical analysis chart with MACD and Moving Averages
    
    Parameters:
    ticker (str): Stock ticker symbol
    period (str): Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
    save_path (str): Directory to save the chart
    
    Returns:
    bool: True if successful, False if there was an error
    """
    # Validate period
    valid_periods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']
    if period not in valid_periods:
        print(f"Invalid period. Please use one of: {', '.join(valid_periods)}")
        return False
    
    try:
        # Get data from yfinance
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)
        
        if df.empty:
            print(f"No data found for ticker {ticker}")
            return False
        
        # Calculate indicators
        df['MA50'] = df['Close'].rolling(window=50).mean()
        df['MA200'] = df['Close'].rolling(window=200).mean()
        
        # Calculate MACD
        macd = ta.macd(df['Close'])
        df = df.join(macd)
        
        # Create figure with subplots
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10), height_ratios=[2, 1])
        fig.suptitle(f'{ticker} Technical Analysis Chart', fontsize=16)
        
        # Plot price and MAs
        ax1.plot(df.index, df['Close'], label='Price', color='black', alpha=0.7)
        ax1.plot(df.index, df['MA50'], label='50 MA', color='blue', alpha=0.7)
        ax1.plot(df.index, df['MA200'], label='200 MA', color='red', alpha=0.7)
        ax1.set_title('Price and Moving Averages')
        ax1.set_ylabel('Price')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        
        # Plot MACD
        ax2.plot(df.index, df['MACD_12_26_9'], label='MACD', color='blue')
        ax2.plot(df.index, df['MACDs_12_26_9'], label='Signal', color='red')
        ax2.bar(df.index, df['MACDh_12_26_9'], label='Histogram', 
                color=df['MACDh_12_26_9'].apply(lambda x: 'green' if x >= 0 else 'red'),
                alpha=0.5)
        ax2.set_title('MACD')
        ax2.set_ylabel('MACD')
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        
        # Adjust layout
        plt.tight_layout()
        
        # Create directory if it doesn't exist
        if not os.path.exists(save_path):
            os.makedirs(save_path)
        
        # Save chart
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{save_path}/{ticker}_{period}_{timestamp}.png"
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        
        
        print(f"Chart saved successfully as {filename}")
        return True
        
    except Exception as e:
        print(f"Error generating chart: {str(e)}")
        return False
    


    
@app.post("/model_def", response_model=ModResponse)
async def chat(request: ModRequest):

    
    try:
        
        # Determine which option to use based on model name
        if request.model_name == "Llama Meta":
            option = 2
        elif request.model_name == "OpenAI":
            option = 1
        else:
            return ModResponse(
                status="error",
                message=f"Invalid model name: {request.model_name}. Must be 'Llama Meta' or 'OpenAI'"
            )
        
        # Store in app state
        app.state.model_name = request.model_name
        app.state.option = 2 if request.model_name == "Llama Meta" else 1

        print(f'Model change request received {request.model_name}')
        print(f'stored app.state  {app.state.option}')
        
        
        
        return ModResponse(
            status="success",
            message=f"Successfully loaded model: {request.model_name}"
        )
    
    except Exception as e:
        return ModResponse(
            status="error",
            message=f"Error loading model: {str(e)}"
        )
    

@app.post("/blog_request", response_model=BlogResponse)
async def process_blog_request(request: BlogRequest):
    try:
        if  app.state.option == 1:
            blog_content_creation_crew = Crew(
                agents=[
                web_search_agent,
                blog_content_creator_agent

                ],
                tasks=[
                blog_find_data_task,
                blog_create_content_task
                ],
                process=Process.sequential,
                verbose=True
            )

            result = blog_content_creation_crew.kickoff(inputs={
                'subject': f'{request.content}'
                })

            # Convert Markdown to HTML

            print(result)

            return BlogResponse(message=str(result))
        else:
            blog_content_creation_crew = Crew(
                agents=[
                web_search_agent_groq,
                blog_content_creator_agent

                ],
                tasks=[
                blog_find_data_task,
                blog_create_content_task
                ],
                process=Process.sequential,
                verbose=True
            )

            result = blog_content_creation_crew.kickoff(inputs={
                'subject': f'{request.content}'
                })

            # Convert Markdown to HTML

            print(result)

            return BlogResponse(message=str(result))
            pass
    
    except Exception as e:
        traceback.print_exc()
        logging.error(f"Blog generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    


@app.post("/posts_request", response_model=PostResponse)
async def process_blog_request(request: PostRequest):
    try:
        
        if  app.state.option == 1:
            post_content_creation_crew = Crew(
                agents=[
                web_search_agent,
                post_content_creator_agent

                ],
                tasks=[
                social_find_data_task,
                social_create_content_task
                ],
                process=Process.sequential,
                verbose=True
            )

            result = post_content_creation_crew.kickoff(inputs={
                'subject': f'{request.content}'
                })

            

            print(result)

            return PostResponse(message=str(result))
        else:
            post_content_creation_crew = Crew(
                agents=[
                web_search_agent_groq,  # This crew uses groq for web search 
                post_content_creator_agent

                ],
                tasks=[
                social_find_data_task,
                social_create_content_task
                ],
                process=Process.sequential,
                verbose=True
            )

            result = post_content_creation_crew.kickoff(inputs={
                'subject': f'{request.content}'
                })


            print(result)

            return PostResponse(message=str(result))
        
    
    except Exception as e:
        traceback.print_exc()
        logging.error(f"Blog generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    




    
@app.post("/arxiv/search", response_model=PaperSearchResponse)
async def search_arxiv(request: ArxivSearchRequest):
    """Search ArXiv and download papers"""
    init_directories()
    
    search = arxiv.Search(
        query=request.query,
        max_results=request.max_results
    )
    
    downloaded_papers = []
    
    for paper in arxiv.Client().results(search):
        try:
            # Create a sanitized filename from the ArXiv ID
            safe_filename = sanitize_filename(f"{paper.get_short_id()}.pdf")
            pdf_path = DOWNLOAD_DIR / safe_filename
            
            if not pdf_path.exists():  # Only download if file doesn't exist
                paper.download_pdf(dirpath=str(DOWNLOAD_DIR), filename=safe_filename)
            
            downloaded_papers.append(PaperInfo(
                title=paper.title,
                filename=safe_filename
            ))
        except Exception as e:
            print(f"Failed to download {paper.title}: {str(e)}")
            continue
    
    return PaperSearchResponse(papers=downloaded_papers)

@app.post("/arxiv/process_papers")
async def process_papers(request: PaperProcessRequest):
    """Process selected papers and create vector index"""
    pdf_files = [DOWNLOAD_DIR / filename for filename in request.filenames]
    
    # Directly configure models without Settings class
    openai_llm = OpenAI(model=OPENAI_MODEL)
    embed_model = OpenAIEmbedding()
    
    # Load and process documents
    documents = []
    
    for pdf_path in pdf_files:
        try:
            text = extract_text_from_pdf(pdf_path)
            if text.strip():  # Only add if we got some text
                documents.append(Document(text=text))
        except Exception as e:
            print(f"Error processing {pdf_path}: {str(e)}")
    
    if not documents:
        raise HTTPException(status_code=400, detail="No documents were successfully processed!")
    
    # Create and persist index
    try:
        index = VectorStoreIndex.from_documents(
            documents,
            llm=openai_llm,
            embed_model=embed_model,
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        
        # Save index to disk
        index.storage_context.persist(persist_dir=str(STORAGE_DIR))
        return {"status": "success", "message": "Index created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating index: {str(e)}")

@app.post("/arxiv/chat", response_model=ChatResponse)
async def chat_with_papers(request: ChatRequest):
    """Chat with processed papers"""
    try:
        # Load existing index from disk
        storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
        index = load_index_from_storage(storage_context)
        
        # Create chat engine
        chat_engine = index.as_chat_engine(
            #chat_mode="condense_question",
            chat_mode="condense_plus_context",
            verbose=True
        )
        
        # Generate response
        response = chat_engine.chat(request.query)
        return ChatResponse(response=response.response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error chatting with papers: {str(e)}")

@app.get("/arxiv/existing_index")
async def check_existing_index():
    """Check if an existing index is available"""
    index_exists = (STORAGE_DIR / "docstore.json").exists()
    return {"index_exists": index_exists}


@app.post("/images_request", response_model=ImageResponse)
async def process_blog_request(request: ImageRequest):
    try:
        
        print("Images Requested")
        
        # Create the crew
        image_crew = Crew(
            agents=[image_searcher],
            tasks=[search_task],
            verbose=True
        )

        # Run the crew with the specific subject
        result = image_crew.kickoff(inputs={
            'context': f'{request.content}'
        })

        print("Search Result:", result)

        return ImageResponse(message=str(result))
    
    except Exception as e:
        traceback.print_exc()
        logging.error(f"Blog generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/latest_news", response_model=NewsResponse)
async def get_latest_news(request: NewsRequest):
    try:
        logger.info(f"Received news request for: {request.sector_or_country}")
        
        financial_news_crew = Crew(
            agents=[
                financial_search_agent,
                financial_content_creator_agent
            ],
            tasks=[
                financial_find_news_task,
                financial_create_content_task
            ],
            process=Process.sequential,
            verbose=True
        )

        # Just pass the user's input directly to the crew
        result = financial_news_crew.kickoff(
            inputs={
                'subject': request.sector_or_country
            }
        )

        logger.info("Successfully generated news content")
        return NewsResponse(news=str(result))

    except Exception as e:
        logger.error(f"Error generating news: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing news request: {str(e)}"
        )

@app.post("/fundamental_analysis", response_model=FundamentalResponse)
async def get_latest_news(request: FundamentalRequest):
    try:
        logger.info(f"Received analysis request for: {request.ticker}")
       
        fundamental_crew = Crew(
            agents=[stock_researcher, stock_analyst],
            tasks=[stock_research_task, stock_analysis_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = fundamental_crew.kickoff(
            inputs={
                'ticker': request.ticker
            }
        )
        logger.info("Successfully generated analysis")
        return FundamentalResponse(analysis=str(result))  # Changed from news to analysis
    except Exception as e:
        logger.error(f"Error generating analysis: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing analysis request: {str(e)}"
        )



@app.post("/api/generate-chart", response_model=ChartResponse)
async def generate_chart(request: ChartRequest):
    try:
        temp_dir = "temp_charts"
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        # Clean up old files
        for old_file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, old_file)
            if os.path.isfile(file_path):
                os.remove(file_path)
        
        # Convert '1year' to '1y' for yfinance
        yf_period = '1y'
        
        # Generate chart
        success = generate_ta_chart(request.ticker, yf_period, save_path=temp_dir)
        
        if not success:
            return ChartResponse(
                success=False,
                message="Failed to generate chart",
                error="Chart generation failed"
            )
        
        # Get the latest file
        files = os.listdir(temp_dir)
        if not files:
            return ChartResponse(
                success=False,
                message="Chart file not found",
                error="No output file generated"
            )
        
        latest_file = max([os.path.join(temp_dir, f) for f in files], key=os.path.getctime)
        
        return FileResponse(
            latest_file,
            media_type="image/png",
            filename=f"{request.ticker}_chart.png"
        )
        
    except Exception as e:
        return ChartResponse(
            success=False,
            message="Error generating chart",
            error=str(e)
        )


@app.on_event("startup")
async def startup_event():
    
    try:
        # Default to option 1 (multi_lang) on startup
        print("Api Up and Running")
        app.state.option = 1 # OpenAI by default
        print('Default LLM - OpenAI')

    except Exception as e:
        print(f"Error loading initial model: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

