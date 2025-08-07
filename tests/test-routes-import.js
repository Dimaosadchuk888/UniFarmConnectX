async function testRoutesImport() {
    try {
        console.log('Importing routes...');
        const routes = await import('./server/routes.ts');
        console.log('Routes import successful!');
        console.log('Routes keys:', Object.keys(routes));
        console.log('Default export:', typeof routes.default);
    } catch (error) {
        console.error('Routes import failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRoutesImport();