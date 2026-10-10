import React, { useState } from 'react';
import { Tweet, Thread } from '../../types/index.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { useApp } from '../../context/AppContext.tsx';
import { Download, FileText, Code, FileCode, BookOpen, FileCheck2, Loader2 } from 'lucide-react';

interface Props {
  tweet: Tweet;
  threadData?: Thread;
}

export const ExportMenu: React.FC<Props> = ({ tweet, threadData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { showToast } = useToast();
  const { navigate } = useApp();

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  };

  const exportMarkdown = () => {
    const isThread = Boolean(threadData && threadData.ancestors.length + threadData.replies.length > 0);
    const tweets = isThread
      ? [...(threadData!.ancestors || []), threadData!.mainTweet, ...(threadData!.replies || [])]
      : [tweet];

    let md = `---
title: "Post by @${tweet.author.username}"
author: "${tweet.author.name} (@${tweet.author.username})"
date: "${tweet.createdAt}"
url: "https://x.com/${tweet.author.username}/status/${tweet.id}"
exported_via: "Viewable Privacy Client"
---

# Thread by ${tweet.author.name} (@${tweet.author.username})

`;

    tweets.forEach((t, i) => {
      md += `### [${i + 1}] @${t.author.username} · ${new Date(t.createdAt).toLocaleString()}\n\n`;
      md += `${t.text}\n\n`;
      if (t.media && t.media.length > 0) {
        t.media.forEach((m) => {
          md += `![Media](${m.originalUrl})\n\n`;
        });
      }
      if (t.communityNote) {
        md += `> **Readers added context:**\n> ${t.communityNote.text}\n\n`;
      }
      md += `---\n\n`;
    });

    handleDownloadFile(md, `tweet-${tweet.id}.md`, 'text/markdown');
    setIsOpen(false);
  };

  const exportJSON = () => {
    const data = threadData || tweet;
    const jsonStr = JSON.stringify(data, null, 2);
    handleDownloadFile(jsonStr, `tweet-${tweet.id}.json`, 'application/json');
    setIsOpen(false);
  };

  const exportText = () => {
    const isThread = Boolean(threadData && threadData.ancestors.length + threadData.replies.length > 0);
    const tweets = isThread
      ? [...(threadData!.ancestors || []), threadData!.mainTweet, ...(threadData!.replies || [])]
      : [tweet];

    let txt = `VIEWABLE ARCHIVE EXPORT\n`;
    txt += `Post ID: ${tweet.id}\n`;
    txt += `Author: ${tweet.author.name} (@${tweet.author.username})\n`;
    txt += `=========================================\n\n`;

    tweets.forEach((t, idx) => {
      txt += `[${idx + 1}] ${t.author.name} (@${t.author.username}) · ${new Date(t.createdAt).toLocaleString()}\n`;
      txt += `${t.text}\n`;
      txt += `-----------------------------------------\n\n`;
    });

    handleDownloadFile(txt, `tweet-${tweet.id}.txt`, 'text/plain');
    setIsOpen(false);
  };

  const exportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const payload = threadData || tweet;
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viewable-thread-${tweet.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully', 'success');
    } catch {
      showToast('Failed to export PDF', 'error');
    } finally {
      setIsExportingPdf(false);
      setIsOpen(false);
    }
  };

  const openArticleView = () => {
    navigate('article-view', { tweetId: tweet.id });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-full text-neutral-500 hover:text-sky-400 hover:bg-sky-500/10 transition"
        title="Export Post"
      >
        <Download className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 bottom-full mb-2 z-40 w-52 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={openArticleView}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-neutral-800 flex items-center gap-2.5 transition"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Read as Article</span>
            </button>
            <div className="h-px bg-neutral-800 my-1" />
            <button
              onClick={exportMarkdown}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-neutral-800 flex items-center gap-2.5 transition"
            >
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Export as Markdown</span>
            </button>
            <button
              onClick={exportPDF}
              disabled={isExportingPdf}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-neutral-800 flex items-center gap-2.5 transition disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              ) : (
                <FileCheck2 className="w-4 h-4 text-rose-400" />
              )}
              <span>Export as PDF</span>
            </button>
            <button
              onClick={exportJSON}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-neutral-800 flex items-center gap-2.5 transition"
            >
              <Code className="w-4 h-4 text-amber-400" />
              <span>Export as JSON</span>
            </button>
            <button
              onClick={exportText}
              className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-neutral-800 flex items-center gap-2.5 transition"
            >
              <FileText className="w-4 h-4 text-neutral-400" />
              <span>Export as Plain Text</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
