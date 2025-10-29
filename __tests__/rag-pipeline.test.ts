/**
 * Integration tests for RAG Pipeline
 * Tests the complete flow from document ingestion to search
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { RagPipeline } from '../lib/rag/rag-pipeline'
import { LocalEmbeddingService } from '../lib/rag/embedding-service'
import { LocalVectorStore } from '../lib/rag/vector-store'
import fs from 'fs'
import path from 'path'

describe('RAG Pipeline Integration Tests', () => {
  let ragPipeline: RagPipeline
  let testModelName: string

  beforeAll(async () => {
    // Initialize RAG pipeline with test configuration
    ragPipeline = new RagPipeline('bge-m3:latest', process.env.CHROMA_URL || 'http://localhost:8000')
    await ragPipeline.initialize()
  })

  beforeEach(() => {
    // Generate unique model name for each test
    testModelName = `test_model_${Date.now()}`
  })

  afterAll(async () => {
    // Cleanup test models
    const models = ragPipeline.getRagModels()
    for (const model of models) {
      if (model.name.startsWith('test_model_')) {
        await ragPipeline.deleteRagModel(model.name).catch(() => {})
      }
    }
  })

  describe('Document Processing', () => {
    it('should process a text file successfully', async () => {
      // Create a test file
      const testContent = 'This is a test document for RAG pipeline testing.'
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })

      const model = await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Test model',
        baseModel: 'llama3.2:latest',
        files: [testFile]
      })

      expect(model).toBeDefined()
      expect(model.name).toBe(testModelName)
      expect(model.documentCount).toBe(1)
      expect(model.totalTokens).toBeGreaterThan(0)
    }, 60000) // 60s timeout

    it('should handle multiple files', async () => {
      const file1 = new File(['Document one content'], 'doc1.txt', { type: 'text/plain' })
      const file2 = new File(['Document two content'], 'doc2.txt', { type: 'text/plain' })

      const model = await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Multi-file test',
        baseModel: 'llama3.2:latest',
        files: [file1, file2]
      })

      expect(model.documentCount).toBe(2)
      expect(model.paths.length).toBe(2)
    }, 60000)

    it('should reject empty files', async () => {
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' })

      await expect(
        ragPipeline.createRagModel({
          name: testModelName,
          description: 'Empty file test',
          baseModel: 'llama3.2:latest',
          files: [emptyFile]
        })
      ).rejects.toThrow()
    }, 30000)

    it('should reject duplicate model names', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' })

      // Create first model
      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'First model',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      // Try to create duplicate
      await expect(
        ragPipeline.createRagModel({
          name: testModelName,
          description: 'Duplicate model',
          baseModel: 'llama3.2:latest',
          files: [file]
        })
      ).rejects.toThrow(/already exists/)
    }, 60000)
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create a model with test data
      const file = new File(
        [
          'Machine learning is a subset of artificial intelligence. ',
          'It involves training algorithms on data to make predictions. ',
          'Deep learning is a type of machine learning using neural networks.'
        ].join(''),
        'ml_basics.txt',
        { type: 'text/plain' }
      )

      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'ML basics',
        baseModel: 'llama3.2:latest',
        files: [file]
      })
    }, 60000)

    it('should find relevant results for a query', async () => {
      const results = await ragPipeline.searchRagModel(testModelName, 'What is machine learning?', 5)

      expect(results.contexts.length).toBeGreaterThan(0)
      expect(results.totalResults).toBeGreaterThan(0)
      expect(results.contexts[0].score).toBeGreaterThan(0)
    }, 30000)

    it('should return results sorted by relevance', async () => {
      const results = await ragPipeline.searchRagModel(
        testModelName,
        'deep learning neural networks',
        5
      )

      expect(results.contexts.length).toBeGreaterThan(0)

      // Check that scores are in descending order
      for (let i = 0; i < results.contexts.length - 1; i++) {
        expect(results.contexts[i].score).toBeGreaterThanOrEqual(results.contexts[i + 1].score)
      }
    }, 30000)

    it('should support different search methods', async () => {
      const vectorResults = await ragPipeline.searchRagModel(
        testModelName,
        'machine learning',
        5,
        'vector'
      )

      const hybridResults = await ragPipeline.searchRagModel(
        testModelName,
        'machine learning',
        5,
        'hybrid'
      )

      expect(vectorResults.searchMethod).toBe('vector')
      expect(hybridResults.searchMethod).toBe('hybrid')
    }, 30000)

    it('should handle queries with no results gracefully', async () => {
      const results = await ragPipeline.searchRagModel(
        testModelName,
        'quantum computing blockchain cryptocurrency',
        5
      )

      // Should return results even if not very relevant, or empty array
      expect(Array.isArray(results.contexts)).toBe(true)
    }, 30000)
  })

  describe('Model Management', () => {
    it('should list all RAG models', async () => {
      const file = new File(['Test'], 'test.txt', { type: 'text/plain' })

      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'List test',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      const models = ragPipeline.getRagModels()
      const testModel = models.find(m => m.name === testModelName)

      expect(testModel).toBeDefined()
      expect(testModel?.name).toBe(testModelName)
    }, 60000)

    it('should retrieve a specific model', async () => {
      const file = new File(['Test'], 'test.txt', { type: 'text/plain' })

      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Retrieve test',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      const model = ragPipeline.getRagModel(testModelName)

      expect(model).toBeDefined()
      expect(model?.name).toBe(testModelName)
      expect(model?.description).toBe('Retrieve test')
    }, 60000)

    it('should delete a model successfully', async () => {
      const file = new File(['Test'], 'test.txt', { type: 'text/plain' })

      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Delete test',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      await ragPipeline.deleteRagModel(testModelName)

      const model = ragPipeline.getRagModel(testModelName)
      expect(model).toBeUndefined()
    }, 60000)
  })

  describe('System Health', () => {
    it('should return system statistics', async () => {
      const stats = await ragPipeline.getSystemStats()

      expect(stats).toHaveProperty('models')
      expect(stats).toHaveProperty('vectorStore')
      expect(stats).toHaveProperty('embeddingCache')
      expect(stats).toHaveProperty('metrics')
    })

    it('should perform health check', async () => {
      const health = await ragPipeline.healthCheck()

      expect(health).toHaveProperty('vectorStore')
      expect(health).toHaveProperty('embeddings')
      expect(health).toHaveProperty('overall')
    })
  })

  describe('Performance', () => {
    it('should handle large documents efficiently', async () => {
      // Generate a large document (50KB)
      const largeContent = Array(10000)
        .fill('This is a test sentence for performance testing. ')
        .join('')

      const file = new File([largeContent], 'large.txt', { type: 'text/plain' })

      const startTime = Date.now()

      const model = await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Performance test',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      const duration = Date.now() - startTime

      expect(model).toBeDefined()
      // Should complete within reasonable time (adjust based on hardware)
      expect(duration).toBeLessThan(120000) // 2 minutes max
    }, 180000)

    it('should cache embeddings correctly', async () => {
      const file = new File(['Test for caching'], 'cache.txt', { type: 'text/plain' })

      await ragPipeline.createRagModel({
        name: testModelName,
        description: 'Cache test',
        baseModel: 'llama3.2:latest',
        files: [file]
      })

      // First search - will generate embeddings
      const startTime1 = Date.now()
      await ragPipeline.searchRagModel(testModelName, 'test query', 5)
      const duration1 = Date.now() - startTime1

      // Second search - should use cached embeddings
      const startTime2 = Date.now()
      await ragPipeline.searchRagModel(testModelName, 'test query', 5)
      const duration2 = Date.now() - startTime2

      // Second search should be significantly faster (cached)
      expect(duration2).toBeLessThan(duration1)
    }, 60000)
  })

  describe('Error Handling', () => {
    it('should handle non-existent model gracefully', async () => {
      await expect(
        ragPipeline.searchRagModel('non_existent_model', 'test', 5)
      ).rejects.toThrow(/not found/)
    })

    it('should handle invalid file types gracefully', async () => {
      const invalidFile = new File(['<binary data>'], 'test.bin', { type: 'application/octet-stream' })

      // Should either process or throw a clear error
      await expect(
        ragPipeline.createRagModel({
          name: testModelName,
          description: 'Invalid file test',
          baseModel: 'llama3.2:latest',
          files: [invalidFile]
        })
      ).rejects.toThrow()
    }, 30000)
  })
})
