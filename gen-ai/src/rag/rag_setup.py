"""
RAG System Orchestrator
Coordinates vector storage, retrieval, and generation components
"""

import sys
import os

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from src.ai_providers.gateway import AIGateway
from .vector_store import VectorStore
from .retriever import DocumentRetriever
from config import get_rag_config


class BasicRAG:
    """RAG system that orchestrates vector storage, retrieval, and generation"""
    
    def __init__(self, config=None, collection_name=None, use_persistent=None, vector_store=None):
        """
        Initialize RAG system
        
        Args:
            config: RAGConfig object (uses default if None)
            collection_name: Name for Qdrant collection (uses config default if None)
            use_persistent: If True, use persistent Qdrant storage (uses config default if None)
            vector_store: Optional shared VectorStore instance (creates new one if None)
        """
        self.config = config or get_rag_config()
        self.collection_name = collection_name or self.config.collection_name
        
        # Initialize components
        self.gateway = AIGateway()
        # Use shared vector store if provided, otherwise create new one
        if vector_store is not None:
            self.vector_store = vector_store
        else:
            self.vector_store = VectorStore(use_persistent=use_persistent if use_persistent is not None else self.config.use_persistent)
        self.retriever = DocumentRetriever()
        
        # Setup collection
        self._setup_collection()
    
    def _setup_collection(self):
        """Setup the vector collection"""
        embedding_dim = self.retriever.get_embedding_dimension()
        success = self.vector_store.setup_collection(self.collection_name, embedding_dim)
        if not success:
            raise Exception(f"Failed to setup collection: {self.collection_name}")
    
    def add_documents(self, documents, collection_name=None):
        """
        Add documents to the vector database
        
        Args:
            documents: List of text documents to index
            collection_name: Optional collection name override (defaults to self.collection_name)
            
        Returns:
            Number of documents added
        """
        # Use provided collection or default
        target_collection = collection_name or self.collection_name
        
        # Create embeddings
        embeddings = self.retriever.encode_documents(documents)
        
        # Create points for vector store
        points = self.retriever.create_points(documents, embeddings)
        
        # Add to vector store
        return self.vector_store.add_points(target_collection, points)
    
    def search(self, query, limit=None, collection_name=None):
        """
        Search for relevant documents
        
        Args:
            query: Search query
            limit: Number of results to return (uses config default if None)
            collection_name: Optional collection name override (defaults to self.collection_name)
            
        Returns:
            List of (text, score) tuples
        """
        # Use config default if limit not specified
        if limit is None:
            limit = self.config.top_k
        
        # Use provided collection or default
        target_collection = collection_name or self.collection_name
            
        # Create query embedding
        query_embedding = self.retriever.encode_query(query)
        
        # Search vector store
        return self.vector_store.search(target_collection, query_embedding, limit)
    
    def query(self, question, context_limit=None, max_tokens=None, collection_name=None):
        """
        Answer a question using RAG
        
        Args:
            question: Question to answer
            context_limit: Number of documents to retrieve for context (uses config default if None)
            max_tokens: Maximum tokens for response (uses chat limit if None)
            collection_name: Optional collection name override (defaults to self.collection_name)
            
        Returns:
            Answer string
        """
        # Use config default if context_limit not specified
        if context_limit is None:
            context_limit = self.config.top_k
            
        # Retrieve relevant documents
        retrieved_docs = self.search(question, limit=context_limit, collection_name=collection_name)
        
        if not retrieved_docs:
            # Provide helpful message based on whether collection exists
            target_collection = collection_name or self.collection_name
            try:
                stats = self.vector_store.get_collection_stats(target_collection)
                if stats.get("points_count", 0) == 0:
                    if collection_name and collection_name.startswith("session_docs_"):
                        return "No documents have been ingested for this session yet. Please wait for document ingestion to complete or add more content to your session.", [], []
                    else:
                        return "No documents found in the knowledge base. Please ingest documents first.", [], []
            except Exception:
                # Collection doesn't exist
                if collection_name and collection_name.startswith("session_docs_"):
                    return "Session collection not found. Documents may still be ingesting. Please wait a moment and try again.", [], []
                else:
                    return "Collection not found. Please ensure documents have been ingested.", [], []
            
            return "No relevant documents found for this query.", [], []
        
        # Build RAG context from retrieved documents
        rag_context = "\n\n".join([doc for doc, _ in retrieved_docs])
        
        # Load RAG query template from prompts directory
        from src.utils.prompt_loader import load_prompt_template
        fallback_template = "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
        prompt = load_prompt_template(
            "rag_query_template.txt",
            fallback=fallback_template,
            context=rag_context,
            question=question
        )
        
        # Generate answer with appropriate token limit
        token_limit = max_tokens or self.config.max_chat_tokens
        answer = self.gateway.chat(prompt, max_tokens=token_limit)
        
        # Return answer along with context details for logging
        context_docs = [doc for doc, _ in retrieved_docs]
        context_scores = [score for _, score in retrieved_docs]
        
        return answer, context_docs, context_scores
    
    def get_stats(self):
        """Get collection statistics"""
        stats = self.vector_store.get_collection_stats(self.collection_name)
        if "error" not in stats:
            stats.update({
                "collection_name": stats.get("name", self.collection_name),
                "document_count": stats.get("points_count", 0),
                "vector_size": self.retriever.get_embedding_dimension(),
                "distance": "cosine",
                "model_info": self.retriever.get_model_info()
            })
        else:
            # If there's an error, still provide basic info
            stats.update({
                "collection_name": self.collection_name,
                "document_count": 0,
                "vector_size": self.retriever.get_embedding_dimension(),
                "distance": "cosine",
                "model_info": self.retriever.get_model_info()
            })
        return stats
    
    def clear_collection(self):
        """Clear all documents from the collection"""
        try:
            embedding_dim = self.retriever.get_embedding_dimension()
            
            # Clean up old collections first
            self.vector_store.cleanup_old_collections([self.collection_name])
            
            # Clear the main collection
            self.vector_store.clear_collection(self.collection_name, embedding_dim)
            return {"success": True, "message": f"Cleared collection {self.collection_name}"}
        except Exception as e:
            return {"error": f"Failed to clear collection: {str(e)}"}


def main():
    """Demo of Basic RAG system"""
    print("=== Basic RAG Demo ===\n")
    
    # Sample documents
    documents = [
        "Machine learning is a subset of artificial intelligence that enables computers to learn from data without explicit programming.",
        "Deep learning uses neural networks with multiple layers to model complex patterns in data.",
        "Natural language processing (NLP) combines computational linguistics with machine learning to help computers understand human language.",
        "Computer vision enables machines to interpret and understand visual information from images and videos.",
        "Reinforcement learning is where agents learn optimal behavior by interacting with an environment and receiving rewards.",
    ]
    
    # Initialize RAG
    print("1. Initializing RAG system...")
    rag = BasicRAG()
    print(f"   Available providers: {rag.gateway.get_available_providers()}")
    
    # Add documents
    print("\n2. Adding documents...")
    count = rag.add_documents(documents)
    print(f"   Added {count} documents")
    
    # Show stats
    stats = rag.get_stats()
    print(f"   Collection stats: {stats}")
    
    # Test queries
    queries = [
        "What is machine learning?",
        "How does deep learning work?",
        "What is computer vision?"
    ]
    
    print("\n3. Testing queries...")
    for query in queries:
        print(f"\nQuery: {query}")
        
        # Get answer with RAG
        answer = rag.query(query)
        print(f"Answer: {answer}")
        
        # Show retrieved context
        retrieved = rag.search(query, limit=2)
        print(f"Retrieved docs: {len(retrieved)}")
        for i, (doc, score) in enumerate(retrieved, 1):
            print(f"  [{i}] (score: {score:.3f}) {doc[:100]}...")


if __name__ == "__main__":
    main()
