import React, { useState } from 'react';
import { KnowledgeDocument } from '../types';
import { BookOpen, Folder, FileText, Search, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const KnowledgeBaseView: React.FC = () => {
  const [collections, setCollections] = useState<string[]>([
    'All Documents',
    'Electronics & Microcontrollers',
    'ESP32 & I2S Audio',
    'Computer Networking & IoT',
    'Indian History & Heritage',
    'Ramayan & Mahabharat',
    'Computer Science & Algorithms'
  ]);
  const [selectedCollection, setSelectedCollection] = useState('All Documents');
  const [searchQuery, setSearchQuery] = useState('');

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([
    {
      id: 'doc-1',
      collection: 'ESP32 & I2S Audio',
      title: 'ESP32-S3 I2S DMA Buffer Configuration Guide.pdf',
      fileType: 'pdf',
      chunkCount: 24,
      uploadedAt: 'Today',
      summary: 'Detailed explanation of sample rate clocking, DMA descriptor counts, and stereo-to-mono downsampling for INMP441 and MAX98357A.'
    },
    {
      id: 'doc-2',
      collection: 'Electronics & Microcontrollers',
      title: 'Ohm’s Law & Audio Amplifier Power Supply Filtering.md',
      fileType: 'md',
      chunkCount: 12,
      uploadedAt: 'Yesterday',
      summary: 'Calculations for decoupling capacitor sizing (100uF - 220uF) to suppress voltage dips on 5V rails during peak Class-D speaker output.'
    },
    {
      id: 'doc-3',
      collection: 'Indian History & Heritage',
      title: 'Ancient Indian Scientific Innovations & Astronomy.pdf',
      fileType: 'pdf',
      chunkCount: 48,
      uploadedAt: '3 days ago',
      summary: 'Chronicles Aryabhata, Brahmagupta, and ancient metallurgical advancements in iron pillars and wootz steel.'
    },
    {
      id: 'doc-4',
      collection: 'Ramayan & Mahabharat',
      title: 'Geeta Saar & Dharmic Philosophy Digest.txt',
      fileType: 'txt',
      chunkCount: 36,
      uploadedAt: '1 week ago',
      summary: '18 Chapters of the Bhagavad Gita summarized with context, Nishkama Karma principles, and life lessons.'
    },
    {
      id: 'doc-5',
      collection: 'Computer Networking & IoT',
      title: 'Captive Portal Architecture & RFC 8952 Protocols.pdf',
      fileType: 'pdf',
      chunkCount: 18,
      uploadedAt: '2 days ago',
      summary: 'DNS 53 spoofing mechanisms and HTTP 302 redirection heuristics for Android, iOS, Windows, and macOS.'
    }
  ]);

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocSummary, setNewDocSummary] = useState('');
  const [newDocCollection, setNewDocCollection] = useState('ESP32 & I2S Audio');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      collection: newDocCollection,
      title: newDocTitle.trim(),
      fileType: 'txt',
      chunkCount: Math.floor(Math.random() * 20 + 5),
      uploadedAt: 'Just now',
      summary: newDocSummary.trim() || 'Custom knowledge document indexed for vector retrieval.'
    };

    setDocuments([newDoc, ...documents]);
    setNewDocTitle('');
    setNewDocSummary('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCollection = selectedCollection === 'All Documents' || doc.collection === selectedCollection;
    const matchesQuery = !searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCollection && matchesQuery;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Knowledge Base (Vector RAG)</h3>
            <p className="text-xs text-slate-400">
              Custom collections and documents vectorized to ground Explore AI's voice responses.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Document</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddDoc} className="my-6 p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-3">
          <h4 className="text-xs font-bold text-cyan-300">Upload / Index Document into Vector Store</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g. My IoT Project Schematics.pdf"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Collection</label>
              <select
                value={newDocCollection}
                onChange={(e) => setNewDocCollection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {collections.filter(c => c !== 'All Documents').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Document Summary / Key Facts</label>
            <textarea
              rows={2}
              value={newDocSummary}
              onChange={(e) => setNewDocSummary(e.target.value)}
              placeholder="Summary of knowledge chunks to be indexed..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400"
            >
              Index & Chunk Document
            </button>
          </div>
        </form>
      )}

      {/* Collection Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
        {collections.map(col => (
          <button
            key={col}
            onClick={() => setSelectedCollection(col)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCollection === col
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>{col}</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Semantic search through indexed documents..."
          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocs.map(doc => (
          <div
            key={doc.id}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-white">{doc.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                  {doc.chunkCount} vector chunks
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                {doc.summary}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                <span>Collection: <strong className="text-slate-400">{doc.collection}</strong></span>
                <span>&bull;</span>
                <span>Uploaded: {doc.uploadedAt}</span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(doc.id)}
              className="text-slate-500 hover:text-rose-400 transition p-1.5 self-end sm:self-center"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No documents found matching "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
