// Add this to your browser console to diagnose connection issues
// Open DevTools: F12 -> Console -> Paste this entire code

(function() {
    console.log('🔍 SOLPOKER X - Connection Diagnostic');
    console.log('=====================================');
    
    // 1. Check current URL
    console.log(`📍 Frontend URL: ${window.location.href}`);
    console.log(`📍 Frontend Host: ${window.location.host}`);
    console.log(`📍 Frontend Port: ${window.location.port}`);
    
    // 2. Test backend connectivity
    const backends = [
        'http://localhost:3001',
        `http://${window.location.hostname}:3001`,
        `${window.location.protocol}//${window.location.hostname}:3001`
    ];
    
    console.log('\n🔌 Testing backend connectivity...');
    
    backends.forEach(async (url) => {
        try {
            const response = await fetch(`${url}/api/stats`, { mode: 'cors' });
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${url} is REACHABLE`);
                console.log('   Response:', data);
            } else {
                console.warn(`⚠️  ${url} returned ${response.status}`);
            }
        } catch (err) {
            console.error(`❌ ${url} is NOT reachable`, err.message);
        }
    });
    
    // 3. Check Socket.io
    console.log('\n🔌 Socket.io Check...');
    if (window.io) {
        console.log('✅ Socket.io library loaded');
    } else {
        console.error('❌ Socket.io library NOT loaded');
    }
    
    // 4. Test WebSocket support
    console.log('\n🌐 WebSocket Support...');
    if (window.WebSocket) {
        console.log('✅ WebSocket supported');
    } else {
        console.error('❌ WebSocket NOT supported');
    }
    
    console.log('\n📋 Recommended Actions:');
    console.log('1. Make sure backend is running: cd server && npm run dev');
    console.log('2. Check that backend shows "🚀 Server running on port 3001"');
    console.log('3. Reload frontend: Press F5');
    console.log('4. Check console for connection messages');
    console.log('5. Look for "✅ Connected to Game Server" message');
    
})();
