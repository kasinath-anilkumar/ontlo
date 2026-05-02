import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith('.jsx')) {
            callback(filePath);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(srcDir, function(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if the file imports API_URL
    if (content.includes('import API_URL from')) {
        // Change import
        if (!content.includes('apiFetch')) {
            content = content.replace(/import API_URL from ['"](?:\.\.\/)+utils\/api['"];?/, match => {
                return match.replace('API_URL', 'API_URL, { apiFetch }');
            });
            content = content.replace(/import API_URL from ['"](?:\.\/)+utils\/api['"];?/, match => {
                return match.replace('API_URL', 'API_URL, { apiFetch }');
            });
            modified = true;
        }

        // Replace fetch with apiFetch
        if (content.includes('fetch(')) {
            // Replace fetch(`${API_URL} to apiFetch(`${API_URL}
            content = content.replace(/fetch\(\s*`\$\{API_URL\}/g, 'apiFetch(`${API_URL}');
            
            // Just in case it's fetch(API_URL)
            content = content.replace(/fetch\(\s*API_URL/g, 'apiFetch(API_URL');
            
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
});
