const express = require('express');
const apiRoutes = require('./backend/routes/apiRoutes-complete-fixed.js');

// Create a test app
const app = express();
app.use('/api', apiRoutes);

// Test the route
const testRoute = (path) => {
  console.log(`Testing route: ${path}`);
  const layers = apiRoutes.stack;
  let found = false;

  layers.forEach(layer => {
    if (layer.route && layer.route.path === path) {
      console.log(`✅ Route found: ${path}`);
      console.log(`   Methods: ${Object.keys(layer.route.methods).join(', ')}`);
      found = true;
    }
  });

  if (!found) {
    console.log(`❌ Route not found: ${path}`);
  }
};

// Test the specific route
testRoute('/subscriptions/remaining/:username');

// List all routes
console.log('\nAll routes in apiRoutes-complete-fixed.js:');
apiRoutes.stack.forEach((layer, index) => {
  if (layer.route) {
    console.log(`${index + 1}. ${layer.route.path} - ${Object.keys(layer.route.methods).join(', ')}`);
  }
});
