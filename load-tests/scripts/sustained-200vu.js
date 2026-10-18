import {
    publicBrowsing,
    studentAuthAndProfile,
    studentRegistration,
    eventInspectionAndAdminAccess,
    adminDraftFlow,
    searchAndPagination
} from './scenarios.js';

export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Step 1: 20 VUs
        { duration: '30s', target: 50 },   // Step 2: 50 VUs
        { duration: '30s', target: 100 },  // Step 3: 100 VUs
        { duration: '30s', target: 150 },  // Step 4: 150 VUs
        { duration: '30s', target: 200 },  // Step 5: 200 VUs
        { duration: '10m', target: 200 },  // Sustained 200 VUs for 10 minutes
        { duration: '30s', target: 0 },    // Ramp-down to 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],         // >= 99% success rate
        duration_reads: ['p(95)<1000'],         // p95 <= 1000ms for read endpoints
        duration_writes: ['p(95)<2000'],        // p95 <= 2000ms for write endpoints
        rate_5xx_errors: ['rate<0.001'],        // Zero unexpected 5xx responses
    },
};

export default function () {
    const vuId = __VU;
    const r = Math.random();

    // Realistic journey mix:
    // 40% Public browsing (events, announcements, urgent)
    // 25% Authenticated member queries & profile
    // 15% Student event registration & duplicate checks
    // 10% Event detail inspection & Dept Admin access
    // 5%  Admin draft creation & editing
    // 5%  Search & pagination
    if (r < 0.40) {
        publicBrowsing();
    } else if (r < 0.65) {
        studentAuthAndProfile(vuId);
    } else if (r < 0.80) {
        studentRegistration(vuId);
    } else if (r < 0.90) {
        eventInspectionAndAdminAccess(vuId);
    } else if (r < 0.95) {
        adminDraftFlow(vuId);
    } else {
        searchAndPagination();
    }
}
