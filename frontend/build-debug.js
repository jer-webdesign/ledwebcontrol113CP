// build-debug.js
// Run this script with `node build-debug.js` to diagnose build issues
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    if (fs.existsSync(filePath)) {
        console.log(`✔ Found: ${filePath}`);
    } else {
        console.log(`✖ Missing: ${filePath}`);
    }
}

function checkDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log(`✔ Directory: ${dirPath} (${files.length} items)`);
        files.forEach(f => console.log('  -', f));
    } else {
        console.log(`✖ Missing directory: ${dirPath}`);
    }
}

console.log('--- Build Debug ---');
checkFile(path.join('src', 'pages', 'index.html'));
checkDir(path.join('src', 'js'));
checkDir(path.join('src', 'assets'));
checkDir('dist');
if (fs.existsSync('dist')) {
    checkDir(path.join('dist', 'js'));
    checkDir(path.join('dist', 'css'));
    checkDir(path.join('dist', 'assets'));
}
console.log('-------------------');
