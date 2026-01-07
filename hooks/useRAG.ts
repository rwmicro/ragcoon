import { useEffect, useState } from "react"
import { useRAGSettings } from "@/lib/rag-settings-store"

export interface RetrievalSettings {
    top_k: number
    use_hybrid_search: boolean
    use_reranking: boolean
    use_multi_query: boolean
    use_hyde: boolean
    use_graph_rag: boolean
    auto_route: boolean
    // Advanced settings
    num_hypothetical_docs?: number
    hyde_fusion?: string
    num_query_variations?: number
    graph_expansion_depth?: number
    graph_alpha?: number
    // LLM settings
    llm_model?: string
    temperature?: number
    max_tokens?: number
    system_prompt?: string
    // Multilingual settings
    enable_multilingual?: boolean
    query_language?: string | null
    use_multilingual_embeddings?: boolean
    use_multilingual_bm25?: boolean
    use_multilingual_hyde?: boolean
    use_multilingual_classifier?: boolean
    detect_language?: boolean
}

export function useRAG() {
    const { settings, setLastCollectionId } = useRAGSettings()
    const [activeCollectionId, setActiveCollectionId] = useState(settings.lastCollectionId)

    // Sync activeCollectionId with store
    useEffect(() => {
        if (settings.lastCollectionId !== activeCollectionId) {
            setActiveCollectionId(settings.lastCollectionId)
        }
    }, [settings.lastCollectionId, activeCollectionId])

    const updateActiveCollectionId = (id: string) => {
        setActiveCollectionId(id)
        setLastCollectionId(id)
    }

    // Transform store settings (camelCase) to API format (snake_case)
    const apiSettings: RetrievalSettings = {
        top_k: settings.retrieval.topK,
        use_hybrid_search: settings.retrieval.hybridSearch,
        use_reranking: settings.retrieval.useReranking,

        // Map strategy to booleans
        use_hyde: settings.retrieval.strategy === "hyde",
        use_multi_query: settings.retrieval.strategy === "multi-query",
        use_graph_rag: settings.retrieval.strategy === "graph-rag",

        // Default to false/true for others if needed, or just pass what we have
        auto_route: settings.retrieval.autoRoute,

        // Advanced settings
        num_hypothetical_docs: settings.retrieval.numHypotheticalDocs,
        hyde_fusion: settings.retrieval.hydeFusion,
        num_query_variations: settings.retrieval.numQueryVariations,
        graph_expansion_depth: settings.retrieval.graphExpansionDepth,
        graph_alpha: settings.retrieval.graphAlpha,

        // LLM Settings
        llm_model: settings.llm.model,
        temperature: settings.llm.temperature,
        max_tokens: settings.llm.maxTokens,
        system_prompt: settings.llm.systemPrompt || undefined,

        // Multilingual Settings
        enable_multilingual: settings.retrieval.enableMultilingual,
        query_language: settings.retrieval.queryLanguage,
        use_multilingual_embeddings: settings.retrieval.useMultilingualEmbeddings,
        use_multilingual_bm25: settings.retrieval.useMultilingualBM25,
        use_multilingual_hyde: settings.retrieval.useMultilingualHyDE,
        use_multilingual_classifier: settings.retrieval.useMultilingualClassifier,
        detect_language: settings.retrieval.detectLanguage,
    }

    return {
        settings: apiSettings,
        activeCollectionId,
        setActiveCollectionId: updateActiveCollectionId,
        isEnabled: !!activeCollectionId,
    }
}
