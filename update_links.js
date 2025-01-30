const fs = require('fs').promises;
const path = require('path');

async function updateLinks(directory) {
    try {
        const files = await fs.readdir(directory, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(directory, file.name);
            
            if (file.isDirectory()) {
                // Skip node_modules and .git directories
                if (file.name !== 'node_modules' && file.name !== '.git') {
                    await updateLinks(fullPath);
                }
            } else if (file.name.endsWith('.html')) {
                let content = await fs.readFile(fullPath, 'utf8');
                
                // Replace members.html links with x_analysis.html
                if (content.includes('members.html')) {
                    const updatedContent = content.replace(/href="\.{0,2}\/members\.html"/g, 'href="x_analysis.html"');
                    await fs.writeFile(fullPath, updatedContent, 'utf8');
                    console.log(`Updated links in ${fullPath}`);
                }
            }
        }
    } catch (error) {
        console.error('Error updating links:', error);
    }
}

// Start from the current directory
updateLinks('.');
