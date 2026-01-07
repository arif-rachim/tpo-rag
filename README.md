JAC Rag For Safety

This is the JAC RAG Implementation for safety has 2 main important components:
1. Ingestion 
2. Retrieval ok

**INGESTION**

Ingestion stores pdfs documents into vector database and BM25 index for keyword search. 
This follows suggestion from Capt. Yousuf and Capt. Muhammad

* Capt Yousuf suggest to use re-ranker and graph knowledge
* Capt Muhamad suggest to use hybrid search that combines semantic and keyword search

We choose bge-reranker-v2-m3 (this model support arabic and english) for reranking.
Building full graph knowledge is hard right now, so we use named entity recognition [NER],as a simple way to get graph-like information.

For the hybrid search we need keyword search, so we use BM25.

In summary :
1. We use multilingual embedder model (multilingual-e5-large)
2. We use NER model to pull out people names and organization from the pdfs
3. We use BM25 for keyword matching

How it works:

1. Go through all PDFs in the docs folder.
2. Extract pages and tables from each PDF.
3. Get the text from each page and split it into paragraphs.
4. Break each paragraph into chunks of about 800 characters, overlapping 100 characters so the chunks flow together. A chunk can contain several paragraphs, separated by a blank line.
5. For every chunk we create metadata: file name, page number, total pages, chunk ID, and language.
6. We run NER on each chunk to find any person or organization names and add them to the metadata.
7. At this point we have all the chunks and their metadata.
8. We create embeddings for all chunks using the embedder model.

Storing in the vector database: 9. We build a unique ID for each chunk using `{file_name}_{page}_{index}`. 10. We insert the chunks, their embeddings, metadata, and IDs into a Chroma collection in batches of 100.

Storing in the BM25 index: 11. We read the chunks back from Chroma. 12. We split the text of each chunk into words (tokenize). 13. We build a BM25 index from these tokens and save it to a file with `pickle.dump`.

**Retrieval**

Retrieval gets information from the RAG system. We use MCP tools so the system can work with AskMai.

In short:

1. We use the same embedder model (multilingual‑e5‑large) that we used during ingestion.
2. We use bge‑reranker‑v2‑m3 to re‑rank the results from both semantic and keyword searches.

How it works:

1. The LLM calls the MCP tool `search_document` with the user’s query.
2. The tool encodes the query with the embedder and runs a semantic search in the vector database.
3. The tool also runs a keyword search using the BM25 index.
4. The two result sets are merged and duplicate chunks are removed.
5. The merged chunks are re‑ranked with the reranker model to score how well they match the query.
6. The chunks are sorted by score, and only the top `max_result` chunks are kept.
7. The final chunks are sent back to the LLM, which generates the answer using this information.
