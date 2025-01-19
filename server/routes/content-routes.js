import express from 'express';
import { generateContent, generateVariations } from '../../services/gpt-content-service.js';

const router = express.Router();

router.post('/generate-content', async (req, res) => {
    try {
        const { template, data } = req.body;
        const content = await generateContent(template, data);
        res.json({ content });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});

router.post('/generate-variations', async (req, res) => {
    try {
        const { content } = req.body;
        const variations = await generateVariations(content);
        res.json({ variations });
    } catch (error) {
        console.error('Error generating variations:', error);
        res.status(500).json({ error: 'Failed to generate variations' });
    }
});

export default router;
