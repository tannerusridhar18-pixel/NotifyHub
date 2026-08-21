export const ROLE_NAMES = {
  admin: 'Admin',
  faculty: 'Faculty',
  student: 'Student',
};

export const loginPages = {
  admin: {
    role: 'admin',
    mode: 'login',
    title: 'Admin Login',
    subtitle: 'Securely access application controls for announcements, events, urgent alerts, and campus-wide publishing oversight.',
    description: 'Secure access to the NotifyHub administration portal.',
    panelLabel: 'Admin Access',
    featureItems: [
      { title: 'Broadcast control', description: 'Coordinate institution-wide updates with clarity.' },
      { title: 'Role-based visibility', description: 'Keep messages targeted to the right audience.' },
      { title: 'Fast response', description: 'Escalate urgent notices when timing matters most.' },
    ],
    fields: [
      { name: 'identifier', label: 'Email or Username', type: 'text', placeholder: 'admin@notifyhub.edu', autoComplete: 'username', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', autoComplete: 'current-password', required: true },
    ],
    showForgot: true,
    bottomText: 'Admin accounts are managed by the system administrator.',
    bottomLink: null,
  },
  faculty: {
    role: 'faculty',
    mode: 'login',
    title: 'Faculty Login',
    subtitle: 'Sign in to manage campus announcements and events.',
    description: 'Share academic updates, event reminders, and department notices through one dependable campus channel.',
    panelLabel: 'Faculty Access',
    featureItems: [
      { title: 'Department updates', description: 'Keep classes informed with structured communication.' },
      { title: 'Event promotion', description: 'Highlight workshops, seminars, and campus programs.' },
      { title: 'Trusted delivery', description: 'Reach students quickly without clutter.' },
    ],
    fields: [
      { name: 'identifier', label: 'Email or Username', type: 'text', placeholder: 'faculty@notifyhub.edu', autoComplete: 'username', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', autoComplete: 'current-password', required: true },
    ],
    showForgot: true,
    bottomText: 'Need a faculty account? Register now.',
    bottomLink: { href: '/register/faculty', label: 'Register now' },
  },
  student: {
    role: 'student',
    mode: 'login',
    title: 'Student Login',
    subtitle: 'Sign in to stay updated with campus announcements and events.',
    description: 'Stay connected to classes, events, and urgent campus notices with a clear student-first announcement experience.',
    panelLabel: 'Student Access',
    featureItems: [
      { title: 'Timely alerts', description: 'Never miss important campus updates.' },
      { title: 'Event discovery', description: 'Track seminars, clubs, and academic opportunities.' },
      { title: 'Simple navigation', description: 'Find the right information quickly on any device.' },
    ],
    fields: [
      { name: 'identifier', label: 'Email or Username', type: 'text', placeholder: 'student@notifyhub.edu', autoComplete: 'username', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', autoComplete: 'current-password', required: true },
    ],
    showForgot: true,
    bottomText: 'New to NotifyHub? Register now.',
    bottomLink: { href: '/register/student', label: 'Register now' },
  },
};

export const registerPages = {
  faculty: {
    role: 'faculty',
    mode: 'register',
    title: 'Faculty Registration',
    subtitle: 'Set up your faculty profile for campus announcements and events.',
    description: 'Configure a faculty profile to publish course-related notices, event updates, and department announcements with confidence.',
    panelLabel: 'Faculty Registration',
    featureItems: [
      { title: 'Targeted messaging', description: 'Reach the right students with the right updates.' },
      { title: 'Department identity', description: 'Keep announcements tied to academic context.' },
      { title: 'Professional flow', description: 'Maintain a polished communication experience.' },
    ],
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Enter full name', autoComplete: 'name', required: true },
      { name: 'employeeId', label: 'Faculty/Employee ID', type: 'text', placeholder: 'Enter faculty or employee ID', required: true },
      { name: 'department', label: 'Department', type: 'text', placeholder: 'Enter department', required: true },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'faculty@notifyhub.edu', autoComplete: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password', autoComplete: 'new-password', required: true },
      { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', autoComplete: 'new-password', required: true },
    ],
    showTerms: true,
    bottomText: 'Already registered?',
    bottomLink: { href: '/login/faculty', label: 'Back to login' },
  },
  student: {
    role: 'student',
    mode: 'register',
    title: 'Student Registration',
    subtitle: 'Set up your student profile to stay updated with campus announcements and events.',
    description: 'Join NotifyHub to receive relevant announcements, event reminders, and urgent updates designed for campus life.',
    panelLabel: 'Student Registration',
    featureItems: [
      { title: 'Course visibility', description: 'See updates connected to your academic path.' },
      { title: 'Campus awareness', description: 'Catch important notices before they pass by.' },
      { title: 'Mobile-ready access', description: 'Register and sign in smoothly from anywhere.' },
    ],
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Enter full name', autoComplete: 'name', required: true },
      { name: 'studentId', label: 'Student ID', type: 'text', placeholder: 'Enter student ID', required: true },
      { name: 'department', label: 'Department/Course', type: 'text', placeholder: 'Enter department or course', required: true },
      { name: 'year', label: 'Year', type: 'select', placeholder: 'Select year', required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'] },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'student@notifyhub.edu', autoComplete: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password', autoComplete: 'new-password', required: true },
      { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', autoComplete: 'new-password', required: true },
    ],
    showTerms: true,
    bottomText: 'Already registered?',
    bottomLink: { href: '/login/student', label: 'Back to login' },
  },
};

export const authPortalCards = [
  { title: 'Admin Login', description: 'Secure access to the NotifyHub administration portal.', href: '/login/admin', type: 'login', role: 'admin' },
  { title: 'Faculty Login', description: 'Sign in to manage announcements, events, and academic updates.', href: '/login/faculty', type: 'login', role: 'faculty' },
  { title: 'Faculty Registration', description: 'Set up a faculty account with department-specific profile details.', href: '/register/faculty', type: 'register', role: 'faculty' },
  { title: 'Student Login', description: 'Stay updated with campus announcements, events, and urgent notices.', href: '/login/student', type: 'login', role: 'student' },
  { title: 'Student Registration', description: 'Create a student account to receive personalized campus updates.', href: '/register/student', type: 'register', role: 'student' },
];
