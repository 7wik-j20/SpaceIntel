from langchain_groq import ChatGroq
from langsmith import traceable
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
from app.core.config import settings

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0
)

# --- State schema ---
class AgentState(TypedDict):
    question: str
    category: str
    strategy: dict
    chunks: list
    answer: str
    sources: list
    user_id: Optional[str]
    filename: Optional[str]

# --- Nodes ---
@traceable(name="classify_query")
def classify_node(state: AgentState) -> AgentState:
    prompt = f"""Classify this space research question into one of these categories:

- SIMPLE: Basic factual question answerable from a single document section
- COMPLEX: Question requiring synthesis across multiple sections or documents
- COMPARISON: Question asking to compare missions, satellites, or agencies
- SUMMARY: Request to summarize a document or topic

Return ONLY the category name, nothing else.

Question: {state["question"]}

Category:"""

    response = llm.invoke(prompt)
    category = response.content.strip().upper()
    valid = ["SIMPLE", "COMPLEX", "COMPARISON", "SUMMARY"]
    category = category if category in valid else "SIMPLE"

    strategies = {
        "SIMPLE":     {"top_k": 3,  "rerank_k": 3, "max_tokens": 512,  "label": "Quick Answer"},
        "COMPLEX":    {"top_k": 10, "rerank_k": 5, "max_tokens": 1024, "label": "Deep Analysis"},
        "COMPARISON": {"top_k": 10, "rerank_k": 6, "max_tokens": 1024, "label": "Comparison"},
        "SUMMARY":    {"top_k": 8,  "rerank_k": 5, "max_tokens": 1024, "label": "Summary"},
    }

    strategy = strategies[category]
    strategy["category"] = category
    return {**state, "category": category, "strategy": strategy}

@traceable(name="retrieve_chunks")
def retrieve_node(state: AgentState) -> AgentState:
    from app.services.hybrid_search import hybrid_search

    chunks = hybrid_search(
        query=state["question"],
        top_k=state["strategy"]["top_k"],
        user_id=state.get("user_id"),
        filename=state.get("filename")
    )
    return {**state, "chunks": chunks}

@traceable(name="rerank_chunks")
def rerank_node(state: AgentState) -> AgentState:
    from app.services.reranker import rerank

    reranked = rerank(
        query=state["question"],
        chunks=state["chunks"],
        top_k=state["strategy"]["rerank_k"]
    )
    return {**state, "chunks": reranked}

@traceable(name="generate_answer")
def generate_node(state: AgentState) -> AgentState:
    from app.services.qa_service import generate_answer

    answer, sources = generate_answer(
        question=state["question"],
        chunks=state["chunks"],
        max_tokens=state["strategy"]["max_tokens"]
    )
    return {**state, "answer": answer, "sources": sources}

@traceable(name="summarize")
def summarize_node(state: AgentState) -> AgentState:
    from app.services.summarizer import summarize_chunks

    summary = summarize_chunks(
        chunks=state["chunks"],
        filename=state.get("filename", "document")
    )
    return {**state, "answer": summary, "sources": []}

@traceable(name="compare")
def compare_node(state: AgentState) -> AgentState:
    from app.services.comparator import compare_chunks

    comparison = compare_chunks(
        query=state["question"],
        chunks=state["chunks"]
    )
    return {**state, "answer": comparison, "sources": []}

# --- Router ---
def route(state: AgentState) -> str:
    return state["category"]

# --- Build graph ---
def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("classify",  classify_node)
    graph.add_node("retrieve",  retrieve_node)
    graph.add_node("rerank",    rerank_node)
    graph.add_node("generate",  generate_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("compare",   compare_node)

    graph.set_entry_point("classify")

    graph.add_edge("classify", "retrieve")
    graph.add_edge("retrieve", "rerank")

    graph.add_conditional_edges("rerank", route, {
        "SIMPLE":     "generate",
        "COMPLEX":    "generate",
        "SUMMARY":    "summarize",
        "COMPARISON": "compare",
    })

    graph.add_edge("generate",  END)
    graph.add_edge("summarize", END)
    graph.add_edge("compare",   END)

    return graph.compile()

# --- Public entrypoint ---
agent_graph = build_graph()

@traceable(name="run_agent")
def run_agent(question: str, user_id: str = None, filename: str = None) -> dict:
    result = agent_graph.invoke({
        "question": question,
        "category": "",
        "strategy": {},
        "chunks": [],
        "answer": "",
        "sources": [],
        "user_id": user_id,
        "filename": filename,
    })
    return {
        "answer":   result["answer"],
        "sources":  result["sources"],
        "category": result["category"],
        "label":    result["strategy"].get("label", ""),
    }