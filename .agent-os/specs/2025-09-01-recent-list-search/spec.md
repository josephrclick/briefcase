# Spec Requirements Document

> Spec: Recent List Search Enhancement
> Created: 2025-09-01

## Overview

Enhance the existing Recent Documents list with search functionality to enable users to quickly find previously summarized content. This feature will add real-time filtering capabilities to the RecentList component, allowing users to search through titles, domains, and summary text without leaving the side panel.

## User Stories

### Quick Document Search

As a knowledge worker, I want to search through my recent documents, so that I can quickly find a specific article I summarized days ago.

The user opens the History tab and sees their 20 most recent documents. They type a keyword into the search field at the top of the list, and the documents instantly filter to show only those matching their query. The search covers document titles, domains, and summary content, highlighting matches when found. If no results match, a friendly message appears suggesting alternative search terms.

### Domain-Based Filtering

As a researcher, I want to filter documents by website domain, so that I can review all content from a specific source.

When reviewing articles for a research project, the user types a domain name (e.g., "nytimes") into the search field. The list immediately filters to show only articles from that domain, making it easy to review all content from a particular publication without manually scrolling through the entire list.

## Spec Scope

1. **Search Input Field** - Add a text input at the top of the RecentList component for entering search queries
2. **Real-time Filtering** - Filter documents instantly as the user types, with no submit button required
3. **Multi-field Search** - Search across document titles, domains, and summary text content
4. **Clear Search** - Provide a clear button (×) to reset the search and show all documents
5. **Empty State Handling** - Display appropriate messaging when no documents match the search query

## Out of Scope

- Advanced search operators (AND, OR, NOT)
- Search result highlighting within the summary preview text
- Search history or saved searches
- Searching through the full raw text (only title, domain, and summary are searched)
- Export of search results
- Search across documents beyond the displayed 20 items

## Expected Deliverable

1. Users can type in a search field and see filtered results appear instantly in the Recent Documents list
2. The search functionality works across titles, domains, and summary content without performance issues
3. Users can clear their search with a single click to return to the full list of recent documents
