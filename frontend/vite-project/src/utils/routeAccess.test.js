import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardRouteForUser, canAccessDashboardRoute } from './routeAccess.js';

test('manager dashboard route resolves to the manager dashboard', () => {
  assert.equal(getDashboardRouteForUser({ userType: 'manager' }), '/dashboard');
});

test('admin dashboard route resolves to the admin dashboard', () => {
  assert.equal(getDashboardRouteForUser({ userType: 'admin' }), '/admin');
});

test('staff dashboard route resolves to the dedicated staff dashboard', () => {
  assert.equal(getDashboardRouteForUser({ userType: 'staff' }), '/staff-dashboard');
});

test('staff cannot access the manager dashboard route', () => {
  assert.equal(canAccessDashboardRoute({ userType: 'staff' }, '/dashboard'), false);
});

test('manager can access the manager dashboard route', () => {
  assert.equal(canAccessDashboardRoute({ userType: 'manager' }, '/dashboard'), true);
});
