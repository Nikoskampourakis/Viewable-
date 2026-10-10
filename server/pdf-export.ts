/**
 * PDF Export Service using pdfkit (Zero headless browser overhead)
 * Renders high-fidelity, printable PDF documents of tweets and threads.
 */

import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Tweet, Thread } from './types.ts';

export async function handlePdfExport(req: Request, res: Response) {
  try {
    const threadData: Thread | Tweet = req.body;
    if (!threadData) {
      res.status(400).json({ error: 'Missing tweet/thread payload' });
      return;
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Viewable - Post Export',
        Author: 'Viewable Anonymous Client',
        Creator: 'Viewable PDF Engine',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="viewable-thread.pdf"');
    doc.pipe(res);

    // Header Branding
    doc
      .fontSize(22)
      .fillColor('#1d9bf0')
      .text('Viewable', { continued: true })
      .fontSize(12)
      .fillColor('#71767b')
      .text('  ·  Privacy-Preserving Thread Archive', { align: 'left' });

    doc.moveDown(1);
    doc.strokeColor('#2f3336').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    const isThread = 'mainTweet' in threadData;
    const tweetsToRender: Tweet[] = isThread
      ? [...(threadData.ancestors || []), threadData.mainTweet, ...(threadData.replies || [])]
      : [threadData as Tweet];

    for (let i = 0; i < tweetsToRender.length; i++) {
      const tweet = tweetsToRender[i];
      const isMain = isThread ? tweet.id === threadData.mainTweet.id : true;

      // Author Box
      doc
        .fontSize(isMain ? 14 : 12)
        .fillColor('#0f1419')
        .text(tweet.author.name, { continued: true })
        .fontSize(11)
        .fillColor('#536471')
        .text(` @${tweet.author.username}  ·  ${new Date(tweet.createdAt).toLocaleString()}`);

      doc.moveDown(0.5);

      // Tweet Text
      doc
        .fontSize(isMain ? 13 : 11)
        .fillColor('#0f1419')
        .lineGap(3)
        .text(tweet.text, { align: 'left' });

      // Community Note if present
      if (tweet.communityNote) {
        doc.moveDown(0.5);
        doc
          .rect(50, doc.y, 495, 45)
          .fillAndStroke('#eff3f4', '#cfd9de');
        doc
          .fillColor('#0f1419')
          .fontSize(10)
          .text(`Readers added context:\n${tweet.communityNote.text}`, 60, doc.y - 38, { width: 475 });
        doc.moveDown(0.5);
      }

      // Stats
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor('#536471')
        .text(`❤️ ${tweet.stats.likes.toLocaleString()}   🔁 ${tweet.stats.retweets.toLocaleString()}   💬 ${tweet.stats.replies.toLocaleString()}   👁️ ${(tweet.stats.views || 0).toLocaleString()}`);

      doc.moveDown(1);
      if (i < tweetsToRender.length - 1) {
        doc.strokeColor('#eff3f4').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
      }
    }

    // Footer
    doc
      .fontSize(9)
      .fillColor('#8b98a5')
      .text('Exported cleanly via Viewable. No trackers or third-party cookies used.', 50, 780, { align: 'center' });

    doc.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: `PDF generation failed: ${err?.message}` });
    }
  }
}
