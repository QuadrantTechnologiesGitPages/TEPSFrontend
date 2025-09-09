const { BlobServiceClient } = require('@azure/storage-blob');
const pdf = require('pdf-parse');
const searchService = require('./searchService');

class ResumeProcessor {
    constructor() {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING
        );
        this.containerName = 'resumes';
    }

    // Upload resume to blob storage and extract text
    async processResume(fileBuffer, fileName, candidateId) {
        try {
            console.log(`📄 Processing resume for candidate ${candidateId}...`);
            
            // Upload to blob storage
            const blobName = `${candidateId}-${Date.now()}-${fileName}`;
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            
            await blockBlobClient.upload(fileBuffer, fileBuffer.length);
            const resumeUrl = blockBlobClient.url;
            console.log(`✅ Resume uploaded to: ${resumeUrl}`);
            
            // Extract text based on file type
            let extractedText = '';
            const fileExtension = fileName.split('.').pop().toLowerCase();
            
            if (fileExtension === 'pdf') {
                // Extract text from PDF
                try {
                    const pdfData = await pdf(fileBuffer);
                    extractedText = pdfData.text;
                    console.log(`📝 Extracted ${extractedText.length} characters from PDF`);
                } catch (pdfError) {
                    console.error('PDF extraction error:', pdfError);
                    extractedText = 'Unable to extract text from PDF';
                }
            } else if (fileExtension === 'txt') {
                // Plain text file
                extractedText = fileBuffer.toString('utf8');
            } else if (fileExtension === 'docx') {
                // For DOCX, we'll just store a placeholder
                // (Full DOCX parsing would require additional library)
                extractedText = 'DOCX file - text extraction pending';
            }
            
            // Clean up the text
            extractedText = this.cleanText(extractedText);
            
            return {
                resumeUrl,
                resumeText: extractedText,
                fileName: fileName,
                blobName: blobName
            };
            
        } catch (error) {
            console.error('Resume processing error:', error);
            throw error;
        }
    }
    
    // Clean and normalize extracted text
    cleanText(text) {
        if (!text) return '';
        
        // Remove excessive whitespace and special characters
        return text
            .replace(/\s+/g, ' ')           // Multiple spaces to single
            .replace(/[\r\n]+/g, ' ')       // Line breaks to spaces
            .replace(/[^\w\s.,;:()-]/g, '') // Keep only alphanumeric and basic punctuation
            .trim()
            .substring(0, 32000);            // Azure Search limit
    }
    
    // Process resume and update candidate in search index
    async processAndIndexResume(fileBuffer, fileName, candidateData) {
        try {
            // Process the resume
            const resumeData = await this.processResume(
                fileBuffer, 
                fileName, 
                candidateData.candidateId || candidateData.id
            );
            
            // Update candidate with resume data
            const updatedCandidate = {
                ...candidateData,
                resumeText: resumeData.resumeText,
                resumeUrl: resumeData.resumeUrl
            };
            
            // Index to Azure Search
            await searchService.indexCandidate(updatedCandidate);
            
            console.log(`✅ Resume processed and indexed for ${candidateData.fullName || candidateData.name}`);
            
            return {
                success: true,
                resumeUrl: resumeData.resumeUrl,
                textLength: resumeData.resumeText.length
            };
            
        } catch (error) {
            console.error('Process and index error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new ResumeProcessor();