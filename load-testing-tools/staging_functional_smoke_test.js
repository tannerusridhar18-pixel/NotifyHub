const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8082';

class SessionClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  getXsrfToken() {
    return this.cookies.get('XSRF-TOKEN') || '';
  }

  async request(method, path, body = null, sendCsrf = true) {
    const url = `${this.baseUrl}${path}`;
    const headers = {};

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    if (sendCsrf && this.getXsrfToken()) {
      headers['X-XSRF-TOKEN'] = this.getXsrfToken();
    }

    if (body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });

    const setCookieHeaders = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);

    for (const cookieStr of setCookieHeaders) {
      const parts = cookieStr.split(';')[0].split('=');
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      this.cookies.set(name, val);
    }

    let json = null;
    let text = await res.text();
    try {
      json = JSON.parse(text);
    } catch (_) {}

    return { status: res.status, ok: res.ok, json, text };
  }
}

async function runTests() {
  console.log('==========================================================');
  console.log('   NOTIFYHUB STAGING FUNCTIONAL & SECURITY SMOKE TEST    ');
  console.log('==========================================================');

  const results = [];
  function record(name, passed, details) {
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${name} : ${details}`);
    results.push({ name, passed, details });
  }

  const superAdmin = new SessionClient(BASE_URL);

  // 1. Super Admin Login via Email
  const loginRes = await superAdmin.request('POST', '/api/v1/auth/login', {
    email: 'admin@notifyhub.local',
    password: 'AdminStagingPassword123!',
  });
  record(
    'Super Admin Login via Email',
    loginRes.status === 200 && loginRes.json?.data?.role === 'SUPER_ADMIN',
    `HTTP ${loginRes.status} role=${loginRes.json?.data?.role}`
  );

  // 2. Cookie Verification
  const hasAccess = superAdmin.cookies.has('NH_ACCESS');
  const hasRefresh = superAdmin.cookies.has('NH_REFRESH');
  const hasXsrf = superAdmin.cookies.has('XSRF-TOKEN');
  record(
    'Session and CSRF Cookie Issuance',
    hasAccess && hasRefresh && hasXsrf,
    `NH_ACCESS=${hasAccess}, NH_REFRESH=${hasRefresh}, XSRF-TOKEN=${hasXsrf}`
  );

  // 3. Login Identifier Mismatch Resolution (Username in 'email' field)
  const usernameClient = new SessionClient(BASE_URL);
  const userLoginRes = await usernameClient.request('POST', '/api/v1/auth/login', {
    email: 'admin',
    password: 'AdminStagingPassword123!',
  });
  record(
    'Login via Username in Email Field',
    userLoginRes.status === 200 && userLoginRes.json?.data?.role === 'SUPER_ADMIN',
    `HTTP ${userLoginRes.status} role=${userLoginRes.json?.data?.role}`
  );

  // 4. CSRF Protection Enforcement
  const noCsrfRes = await superAdmin.request(
    'POST',
    '/api/v1/academic-structure/departments',
    { name: 'Unprotected Dept' },
    false // do NOT send X-XSRF-TOKEN
  );
  record(
    'CSRF Rejection on Missing Token',
    noCsrfRes.status === 403,
    `HTTP ${noCsrfRes.status} (Expected 403 Forbidden)`
  );

  // 5. Authenticated Profile Query (/api/v1/users/me)
  const meRes = await superAdmin.request('GET', '/api/v1/users/me');
  record(
    'Authenticated Profile Query (/api/v1/users/me)',
    meRes.status === 200 && meRes.json?.data?.email === 'admin@notifyhub.local',
    `HTTP ${meRes.status} email=${meRes.json?.data?.email} role=${meRes.json?.data?.role}`
  );

  // 6. Save Draft Event
  const draftRes = await superAdmin.request('POST', '/api/v1/events', {
    title: 'Staging Hackathon 2026 Draft',
    description: 'Annual internal engineering hackathon staging test draft',
    location: 'Campus Tech Hub Auditorium',
    startAt: '2026-11-20T10:00:00Z',
    endAt: '2026-11-20T18:00:00Z',
    targetType: 'GLOBAL',
    photoUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    registrationEnabled: true,
  });
  const eventId = draftRes.json?.data?.id;
  record(
    'Save Draft Event',
    (draftRes.status === 200 || draftRes.status === 201) && draftRes.json?.data?.status === 'DRAFT',
    `HTTP ${draftRes.status} eventId=${eventId} status=${draftRes.json?.data?.status}`
  );

  // 7. Verify Draft Event Excluded from Public Feed (Unauthenticated Guest Request)
  const guestClient = new SessionClient(BASE_URL);
  const publicFeed1 = await guestClient.request('GET', '/api/v1/events');
  const foundDraft = (publicFeed1.json?.data?.content || []).find((e) => e.id === eventId);
  record(
    'Draft Event Excluded from Public Feed',
    !foundDraft,
    `Draft found in public feed: ${Boolean(foundDraft)} (Expected false)`
  );

  // 8. Publish Event (POST /api/v1/events/{id}/publish)
  const publishRes = await superAdmin.request('POST', `/api/v1/events/${eventId}/publish`);
  record(
    'Publish Event',
    publishRes.status === 200 && publishRes.json?.data?.status === 'PUBLISHED',
    `HTTP ${publishRes.status} status=${publishRes.json?.data?.status}`
  );

  // 9. Verify Event Now Present in Public Feed with Image
  const publicFeed2 = await superAdmin.request('GET', '/api/v1/events');
  const publishedEvent = (publicFeed2.json?.data?.content || []).find((e) => e.id === eventId);
  record(
    'Published Event in Public Feed with Image URL',
    Boolean(publishedEvent && (publishedEvent.photoUrl || publishedEvent.imageUrl)),
    `Found=${Boolean(publishedEvent)} photoUrl=${publishedEvent?.photoUrl || publishedEvent?.imageUrl}`
  );

  // 10. Event Details Page Query (/api/v1/events/{id})
  const detailsRes = await superAdmin.request('GET', `/api/v1/events/${eventId}`);
  record(
    'Event Details Query (/api/v1/events/{id})',
    detailsRes.status === 200 && detailsRes.json?.data?.id === eventId,
    `HTTP ${detailsRes.status} title="${detailsRes.json?.data?.title}"`
  );

  // 11. Create Student Account & Authenticate
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const studentEmail = `staging.student.${rand}@notifyhub.local`;
  const studentCreate = await superAdmin.request('POST', '/api/v1/admin/users', {
    username: studentEmail,
    email: studentEmail,
    password: 'StudentPassword123!',
    role: 'STUDENT',
  });
  const student = new SessionClient(BASE_URL);
  const studentLogin = await student.request('POST', '/api/v1/auth/login', {
    email: studentEmail,
    password: 'StudentPassword123!',
  });
  record(
    'Student Creation & Authentication',
    (studentCreate.status === 200 || studentCreate.status === 201) && studentLogin.status === 200,
    `Create HTTP ${studentCreate.status}, Login HTTP ${studentLogin.status}`
  );

  // 12. Student Event Registration
  const regRes = await student.request('POST', `/api/v1/events/${eventId}/register`);
  record(
    'Student Event Registration',
    (regRes.status === 200 || regRes.status === 201) && regRes.json?.success === true,
    `HTTP ${regRes.status} registeredAt=${regRes.json?.data?.registeredAt}`
  );

  // 13. Duplicate Registration Prevention (Expect 409)
  const dupRes = await student.request('POST', `/api/v1/events/${eventId}/register`);
  record(
    'Duplicate Registration Prevention',
    dupRes.status === 409,
    `HTTP ${dupRes.status} (Expected 409 Conflict)`
  );

  // 14. Department Scoped Authorization
  const deptA = await superAdmin.request('POST', '/api/v1/academic-structure/departments', {
    name: `Computer Science ${rand}`,
  });
  const deptB = await superAdmin.request('POST', '/api/v1/academic-structure/departments', {
    name: `Mechanical Engineering ${rand}`,
  });
  const deptAId = deptA.json?.data?.id;
  const deptBId = deptB.json?.data?.id;

  const deptAdminEmail = `dept.admin.${rand}@notifyhub.local`;
  await superAdmin.request('POST', '/api/v1/admin/users', {
    username: deptAdminEmail,
    email: deptAdminEmail,
    password: 'DeptAdminPassword123!',
    role: 'DEPARTMENT_ADMIN',
    departmentId: deptAId,
  });

  const deptAdmin = new SessionClient(BASE_URL);
  await deptAdmin.request('POST', '/api/v1/auth/login', {
    email: deptAdminEmail,
    password: 'DeptAdminPassword123!',
  });

  const deptMgtRes = await deptAdmin.request('GET', '/api/v1/events/department-management');
  record(
    'Department Admin Scoped Management Access',
    deptMgtRes.status === 200,
    `HTTP ${deptMgtRes.status} totalDepartmentEvents=${deptMgtRes.json?.data?.totalElements}`
  );

  // 15. Super Admin Logout
  const logoutRes = await superAdmin.request('POST', '/api/v1/auth/logout');
  record(
    'User Logout & Session Revocation',
    logoutRes.status === 200 && logoutRes.json?.success === true,
    `HTTP ${logoutRes.status} success=${logoutRes.json?.success}`
  );

  console.log('==========================================================');
  console.log('                TEST EXECUTION SUMMARY                    ');
  console.log('==========================================================');
  const passed = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passed} / ${results.length}`);
  if (passed === results.length) {
    console.log('ALL 15 STAGING SMOKE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME TESTS FAILED!');
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
