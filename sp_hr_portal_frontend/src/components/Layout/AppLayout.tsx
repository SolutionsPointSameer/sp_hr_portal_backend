import { useState } from 'react';
import { Layout, Menu, Button, Dropdown } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    TeamOutlined,
    CalendarOutlined,
    FileDoneOutlined,
    SettingOutlined,
    UserOutlined,
    LogoutOutlined,
    BarChartOutlined,
    DollarOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'My Profile',
            onClick: () => navigate(`/employees/${user?.id}`),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: handleLogout,
            danger: true,
        },
    ];

    const getMenuItems = () => {
        const items: MenuProps['items'] = [
            {
                key: '/dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
            },
        ];

        if (user?.role && ['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            items.push({
                key: 'employees-group',
                icon: <TeamOutlined />,
                label: 'Employees',
                children: [
                    { key: '/employees', label: 'Employee List' },
                    { key: '/employees/org-chart', label: 'Org Chart' },
                ],
            });
        }

        items.push({
            key: 'attendance',
            icon: <CalendarOutlined />,
            label: 'Attendance',
            children: [
                { key: '/attendance/mine', label: 'My Attendance' },
                ...(user?.role && ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)
                    ? [{ key: '/attendance/team', label: 'Team Attendance' }]
                    : []),
            ],
        });

        items.push({
            key: 'leave',
            icon: <FileDoneOutlined />,
            label: 'Leave',
            children: [
                { key: '/leave/mine', label: 'My Leave' },
                { key: '/leave/calendar', label: 'Leave Calendar' },
                ...(user?.role && ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)
                    ? [
                        { key: '/leave/team', label: 'Team Leaves' },
                        { key: '/leave/approvals', label: 'Pending Approvals' }
                    ]
                    : []),
            ],
        });

        // Special items for Admins
        if (user?.role && ['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            items.push({
                key: '/reports',
                icon: <BarChartOutlined />,
                label: 'Reports',
            });
        }

        if (user?.role && ['HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            items.push({
                key: '/payroll',
                icon: <DollarOutlined />,
                label: 'Payroll',
            });
        }

        if (user?.role === 'SUPER_ADMIN') {
            items.push({
                key: 'admin',
                icon: <SettingOutlined />,
                label: 'Admin',
                children: [
                    { key: '/admin/master-data', label: 'Master Data' },
                    { key: '/admin/users', label: 'User Management' },
                    { key: '/admin/holidays', label: 'Holidays Management' },
                    { key: '/admin/settings', label: 'System Settings' },
                ],
            });
        }

        return items;
    };

    // Find the selected key based on the current location
    const getSelectedKeys = () => {
        const path = location.pathname;
        // Org chart has its own exact key
        if (path === '/employees/org-chart') return ['/employees/org-chart'];
        // Any other /employees/* sub-route highlights the list
        if (path.startsWith('/employees')) return ['/employees'];
        return [path];
    };

    const getOpenKeys = () => {
        const path = location.pathname;
        // Map path prefixes to their parent submenu keys
        if (path.startsWith('/employees')) return ['employees-group'];
        if (path.startsWith('/attendance')) return ['attendance'];
        if (path.startsWith('/leave')) return ['leave'];
        if (path.startsWith('/admin')) return ['admin'];
        return [];
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                breakpoint="lg"
                onBreakpoint={(broken) => {
                    if (broken) {
                        setCollapsed(true);
                    }
                }}
                className="app-sider border-r border-slate-200"
            >
                <div className="flex h-16 items-center justify-center py-4 border-b border-slate-200 bg-white">
                    {collapsed ? (
                        <img src="/assets/favicon.png" alt="Logo" className="w-8 h-8 object-contain" />
                    ) : (
                        <img src="/assets/LOGO.png" alt="SP Solutions Point" className="h-10 object-contain px-4" />
                    )}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={getSelectedKeys()}
                    defaultOpenKeys={getOpenKeys()}
                    items={getMenuItems()}
                    onClick={({ key }) => navigate(key)}
                    className="border-none py-2"
                />
            </Sider>
            <Layout>
                <Header className="flex px-4 items-center justify-between border-b border-slate-200 !bg-white !h-16 !leading-[64px]">
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-slate-700 hover:text-slate-900"
                    />
                    <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-block text-slate-600">
                            Welcome, {user?.firstName} {user?.lastName}
                        </span>
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-white cursor-pointer select-none font-semibold">
                                {user?.firstName?.charAt(0) || 'U'}
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content className="p-6 overflow-auto bg-slate-50">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};
