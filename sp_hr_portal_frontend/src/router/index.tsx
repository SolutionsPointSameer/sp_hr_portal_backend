import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/Layout/AppLayout';
import { RequireAuth } from '../components/guards/RequireAuth';
import { RequireRole } from '../components/guards/RequireRole';
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load pages for performance
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const EmployeeList = lazy(() => import('../pages/employees/EmployeeList'));
const EmployeeDetail = lazy(() => import('../pages/employees/EmployeeDetail'));
const EmployeeForm = lazy(() => import('../pages/employees/EmployeeForm'));
const MyAttendance = lazy(() => import('../pages/attendance/MyAttendance'));
const TeamAttendance = lazy(() => import('../pages/attendance/TeamAttendance'));
const MyLeave = lazy(() => import('../pages/leave/MyLeave'));
const TeamLeaves = lazy(() => import('../pages/leave/TeamLeaves'));
const PendingApprovals = lazy(() => import('../pages/leave/PendingApprovals'));
const LeaveCalendar = lazy(() => import('../pages/leave/LeaveCalendar'));
const Reports = lazy(() => import('../pages/reports/Reports'));
const PayrollRuns = lazy(() => import('../pages/payroll/PayrollRuns'));
const PayrollRunDetail = lazy(() => import('../pages/payroll/PayrollRunDetail'));
const Holidays = lazy(() => import('../pages/admin/Holidays'));
const OrgChart = lazy(() => import('../pages/employees/OrgChart'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const SystemSettings = lazy(() => import('../pages/admin/SystemSettings'));
const MasterDataManagement = lazy(() => import('../pages/admin/MasterDataManagement'));

// Forgot Password
const ForgotPassword = lazy(() => import('../pages/forgotPassword/ForgotPassword'));
const ForgotPasswordVerify = lazy(() => import('../pages/forgotPassword/ForgotPasswordVerify'));
const ForgotPasswordReset = lazy(() => import('../pages/forgotPassword/ForgotPasswordReset'));

// Onboarding
const EmployeeOnboardingSetup = lazy(() => import('../pages/onboarding/EmployeeOnboardingSetup'));

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/forgot-password',
        element: <ForgotPassword />,
    },
    {
        path: '/forgot-password/verify',
        element: <ForgotPasswordVerify />,
    },
    {
        path: '/forgot-password/reset',
        element: <ForgotPasswordReset />,
    },
    {
        path: '/',
        element: <RequireAuth />, // Protect all child routes
        children: [
            {
                path: 'onboarding',
                element: <EmployeeOnboardingSetup />
            },
            {
                path: '/',
                element: <AppLayout />, // Wrap all authenticated routes with the layout
                children: [
                    {
                        path: '/',
                        element: <Navigate to="/dashboard" replace />,
                    },
                    {
                        path: 'dashboard',
                        element: <Dashboard />,
                    },
                    // Employees Routes
                    {
                        path: 'employees',
                        children: [
                            { path: '', element: <RequireRole roles={['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']} />, children: [{ path: '', element: <EmployeeList /> }] },
                            { path: 'new', element: <RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']} />, children: [{ path: '', element: <EmployeeForm /> }] },
                            { path: 'org-chart', element: <OrgChart /> },
                            { path: ':id', element: <EmployeeDetail /> },
                            { path: ':id/edit', element: <RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']} />, children: [{ path: '', element: <EmployeeForm /> }] },
                        ]
                    },
                    // Attendance Routes
                    {
                        path: 'attendance',
                        children: [
                            { path: 'mine', element: <MyAttendance /> },
                            {
                                path: 'team',
                                element: <RequireRole roles={['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']} />,
                                children: [{ path: '', element: <TeamAttendance /> }]
                            },
                        ]
                    },
                    // Leave Routes
                    {
                        path: 'leave',
                        children: [
                            { path: 'mine', element: <MyLeave /> },
                            { path: 'calendar', element: <LeaveCalendar /> },
                            {
                                path: 'team',
                                element: <RequireRole roles={['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']} />,
                                children: [{ path: '', element: <TeamLeaves /> }]
                            },
                            {
                                path: 'approvals',
                                element: <RequireRole roles={['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']} />,
                                children: [{ path: '', element: <PendingApprovals /> }]
                            },
                        ]
                    },
                    // Admin & HR Routes
                    {
                        path: 'reports',
                        element: <RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']} />,
                        children: [{ path: '', element: <Reports /> }]
                    },
                    {
                        path: 'payroll',
                        element: <RequireRole roles={['HR_ADMIN', 'SUPER_ADMIN']} />,
                        children: [
                            { path: '', element: <PayrollRuns /> },
                            { path: ':id', element: <PayrollRunDetail /> },
                        ]
                    },
                    {
                        path: 'admin',
                        element: <RequireRole roles={['SUPER_ADMIN']} />,
                        children: [
                            { path: 'master-data', element: <MasterDataManagement /> },
                            { path: 'holidays', element: <Holidays /> },
                            { path: 'users', element: <UserManagement /> },
                            { path: 'settings', element: <SystemSettings /> },
                        ]
                    },
                    {
                        path: '*',
                        element: <Navigate to="/dashboard" replace />,
                    }
                ],
            },
        ],
    },
]);
