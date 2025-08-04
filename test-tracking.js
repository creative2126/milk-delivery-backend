const db = require('./db');

async function testTracking() {
  try {http://localhost:3001/offers-final.html
    console.log('Testing subscription tracking...');
    
    // Check current subscription status
    const [subs] = await db.execute('SELECT id, status FROM subscriptions WHERE id = 6');
    console.log('Current subscription:', subs[0]);
    
    // Update to active if needed
    if (subs[0].status !== 'active') {
      await db.execute('UPDATE subscriptions SET status = ? WHERE id = ?', ['active', 6]);
      console.log('Updated subscription to active');
    }
    
    // Test pause
    console.log('Testing pause...');
    await db.execute(
      'INSERT INTO subscription_status_history (subscription_id, old_status, new_status, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [6, 'active', 'inactive', 'testuser', 'Testing pause']
    );
    
    await db.execute(
      'UPDATE subscriptions SET status = ?, paused_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['inactive', 6]
    );
    
    console.log('✅ Pause test successful');
    
    // Test resume
    console.log('Testing resume...');
    await db.execute(
      'INSERT INTO subscription_status_history (subscription_id, old_status, new_status, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [6, 'inactive', 'active', 'testuser', 'Testing resume']
    );
    
    await db.execute(
      'UPDATE subscriptions SET status = ?, resumed_at = CURRENT_TIMESTAMP, total_paused_days = total_paused_days + 1 WHERE id = ?',
      ['active', 6]
    );
    
    console.log('✅ Resume test successful');
    
    // Check history
    const [history] = await db.execute('SELECT * FROM subscription_status_history WHERE subscription_id = 6 ORDER BY created_at DESC');
    console.log('History records:', history.length);
    console.log('Latest history:', history[0]);
    
    // Check subscription with new columns
    const [updatedSub] = await db.execute('SELECT id, status, paused_at, resumed_at, total_paused_days FROM subscriptions WHERE id = 6');
    console.log('Updated subscription:', updatedSub[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testTracking();
