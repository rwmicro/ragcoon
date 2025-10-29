"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  onLoadMore?: () => void
  hasMore?: boolean
  className?: string
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onLoadMore,
  hasMore = false,
  className
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggered = useRef(false)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = []
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i]) {
        result.push({ item: items[i], index: i })
      }
    }
    return result
  }, [items, visibleRange])

  // Handle scroll with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)
    
    // Check if we need to load more
    if (onLoadMore && hasMore && !loadMoreTriggered.current) {
      const scrollHeight = e.currentTarget.scrollHeight
      const clientHeight = e.currentTarget.clientHeight
      const scrollBottom = scrollTop + clientHeight
      
      if (scrollBottom >= scrollHeight - itemHeight * 3) {
        loadMoreTriggered.current = true
        onLoadMore()
        
        // Reset trigger after a delay
        setTimeout(() => {
          loadMoreTriggered.current = false
        }, 1000)
      }
    }
  }, [onLoadMore, hasMore, itemHeight])

  // Reset load more trigger when items change
  useEffect(() => {
    loadMoreTriggered.current = false
  }, [items.length])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return (
    <div
      ref={scrollElementRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                position: 'relative'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hook for managing virtual list state
export function useVirtualList<T>({
  items,
  pageSize = 50,
  initialLoad = 100
}: {
  items: T[]
  pageSize?: number
  initialLoad?: number
}) {
  const [visibleCount, setVisibleCount] = useState(initialLoad)
  const [isLoading, setIsLoading] = useState(false)
  
  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount)
  }, [items, visibleCount])
  
  const hasMore = visibleCount < items.length
  
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    
    // Simulate async loading delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    setVisibleCount(prev => Math.min(prev + pageSize, items.length))
    setIsLoading(false)
  }, [isLoading, hasMore, pageSize, items.length])
  
  // Reset when items change
  useEffect(() => {
    setVisibleCount(Math.min(initialLoad, items.length))
  }, [items, initialLoad])
  
  return {
    visibleItems,
    hasMore,
    isLoading,
    loadMore
  }
}