import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { task } from "@trigger.dev/sdk";
import { jsPDF } from "jspdf";

// Simple HTML parser for jsPDF
function parseHtmlToPdf(doc: jsPDF, html: string, startY: number = 40) {
  let yPosition = startY;
  const lineHeight = 7;
  const pageHeight = 280;
  const marginLeft = 20;
  const contentWidth = 170;

  // Remove script and style tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Parse HTML into a structured format
  const elements = parseHtmlElements(html);
  
  let currentFontSize = 11;
  let currentTextColor = [51, 51, 51] as [number, number, number];
  let inBlockquote = false;
  let blockquoteIndent = 0;

  for (const element of elements) {
    if (element.type === 'heading') {
      const size = element.level === 1 ? 18 : element.level === 2 ? 15 : element.level === 3 ? 13 : 12;
      yPosition = checkPageBreak(doc, yPosition, size + 5, pageHeight);
      yPosition += element.level === 1 ? 8 : element.level === 2 ? 6 : element.level === 3 ? 5 : 4;
      
      doc.setFontSize(size);
      doc.setTextColor(44, 62, 80);
      const lines = doc.splitTextToSize(element.text, contentWidth - blockquoteIndent);
      for (const line of lines) {
        yPosition = checkPageBreak(doc, yPosition, lineHeight, pageHeight);
        doc.text(line, marginLeft + blockquoteIndent, yPosition);
        yPosition += lineHeight;
      }
      
      currentFontSize = 11;
      currentTextColor = [51, 51, 51] as [number, number, number];
      yPosition += 5;
    } else if (element.type === 'paragraph') {
      yPosition = checkPageBreak(doc, yPosition, lineHeight, pageHeight);
      
      doc.setFontSize(currentFontSize);
      doc.setTextColor(...currentTextColor);
      const lines = doc.splitTextToSize(element.text, contentWidth - blockquoteIndent);
      for (const line of lines) {
        yPosition = checkPageBreak(doc, yPosition, lineHeight, pageHeight);
        doc.text(line, marginLeft + blockquoteIndent, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 5;
    } else if (element.type === 'list') {
      yPosition += 5;
      for (let i = 0; i < element.items.length; i++) {
        const item = element.items[i];
        const prefix = element.ordered ? `${i + 1}. ` : '• ';
        const fullText = prefix + item;
        const lines = doc.splitTextToSize(fullText, contentWidth - blockquoteIndent - 10);
        
        for (const line of lines) {
          yPosition = checkPageBreak(doc, yPosition, lineHeight, pageHeight);
          doc.setFontSize(11);
          doc.setTextColor(51, 51, 51);
          doc.text(line, marginLeft + blockquoteIndent + 10, yPosition);
          yPosition += lineHeight;
        }
      }
      yPosition += 5;
    } else if (element.type === 'blockquote') {
      inBlockquote = true;
      blockquoteIndent = 10;
      yPosition = checkPageBreak(doc, yPosition, lineHeight + 5, pageHeight);
      yPosition += 5;
      
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      const lines = doc.splitTextToSize(element.text, contentWidth - blockquoteIndent);
      for (const line of lines) {
        yPosition = checkPageBreak(doc, yPosition, lineHeight, pageHeight);
        doc.text(line, marginLeft + blockquoteIndent, yPosition);
        yPosition += lineHeight;
      }
      
      inBlockquote = false;
      blockquoteIndent = 0;
      yPosition += 5;
    }
  }

  return yPosition;
}

// Parse HTML into structured elements
function parseHtmlElements(html: string) {
  const elements: any[] = [];
  
  // Remove script and style tags first
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Split by major block elements
  const blocks = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>|<p[^>]*>.*?<\/p>|<ul[^>]*>.*?<\/ul>|<ol[^>]*>.*?<\/ol>|<blockquote[^>]*>.*?<\/blockquote>)/gi);
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    
    const headingMatch = block.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (headingMatch) {
      elements.push({
        type: 'heading',
        level: parseInt(headingMatch[1]),
        text: stripHtml(headingMatch[2]).trim()
      });
      continue;
    }
    
    const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const text = stripHtml(pMatch[1]).trim();
      if (text) {
        elements.push({
          type: 'paragraph',
          text: text
        });
      }
      continue;
    }
    
    const ulMatch = block.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (ulMatch) {
      const items = extractListItems(ulMatch[1]);
      if (items.length > 0) {
        elements.push({
          type: 'list',
          ordered: false,
          items: items
        });
      }
      continue;
    }
    
    const olMatch = block.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (olMatch) {
      const items = extractListItems(olMatch[1]);
      if (items.length > 0) {
        elements.push({
          type: 'list',
          ordered: true,
          items: items
        });
      }
      continue;
    }
    
    const bqMatch = block.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
    if (bqMatch) {
      elements.push({
        type: 'blockquote',
        text: stripHtml(bqMatch[1]).trim()
      });
      continue;
    }
    
    // Plain text without tags
    const text = stripHtml(block).trim();
    if (text) {
      elements.push({
        type: 'paragraph',
        text: text
      });
    }
  }
  
  return elements;
}

// Extract list items from list HTML
function extractListItems(listHtml: string): string[] {
  const items: string[] = [];
  const liMatches = listHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches) {
    for (const match of liMatches) {
      const text = stripHtml(match).trim();
      if (text) {
        items.push(text);
      }
    }
  }
  return items;
}

// Strip HTML tags but preserve text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkPageBreak(doc: jsPDF, yPosition: number, neededSpace: number, pageHeight: number) {
  if (yPosition + neededSpace > pageHeight) {
    doc.addPage();
    return 20;
  }
  return yPosition;
}

// Validate R2 config early for clear error messages
function getR2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "Missing R2 configuration. Required env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL"
    );
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
}

const r2Config = getR2Config();

// Initialize S3 client
const s3Client = new S3Client({
  // How to authenticate to R2: https://developers.cloudflare.com/r2/api/s3/tokens/
  region: "auto",
  endpoint: r2Config.endpoint,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

export const generatePdfAndUpload = task({
  id: "generate-pdf-and-upload",
  run: async (
    payload: { report: string; title?: string; name?: string },
    { ctx },
  ) => {
    try {
      console.log("Report length:", payload.report.length);

      // Generate PDF using jsPDF
      const doc = new jsPDF();
      
      // Add title with wrapping
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      const titleLines = doc.splitTextToSize(payload.title || "Research Report", 170);
      let yPosition = 20;
      for (const line of titleLines) {
        doc.text(line, 20, yPosition);
        yPosition += 10;
      }
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, yPosition + 5);
      
      // Add horizontal line
      yPosition += 12;
      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, 190, yPosition);
      
      // Parse and render HTML content
      parseHtmlToPdf(doc, payload.report, yPosition + 10);
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      console.log("PDF generated successfully, size:", pdfBuffer.length);

      // Upload to R2
      const key = `${payload.name}.pdf`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: r2Config.bucket,
          Key: key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
        }),
      );

      const publicUrl = `${r2Config.publicUrl}/${key}`;

      return {
        key,
        title: payload.title || "Research Report",
        pdfLocation: publicUrl,
      };
    } catch (error) {
      console.error("Error converting PDF:", error);
      throw error;
    }
  },
});

