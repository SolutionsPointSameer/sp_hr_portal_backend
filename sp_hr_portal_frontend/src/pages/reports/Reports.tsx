import { Typography, Card, Tabs, Button, Row, Col, Statistic, Spin, Table, Tag } from 'antd';
import { DownloadOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { useMemo, useState } from 'react';
import { exportToCsv, exportToPdf } from '../../utils/export';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const { Title, Text } = Typography;

export default function Reports() {
    const user = useAuthStore(state => state.user);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [activeTab, setActiveTab] = useState('1');

    // Fetch Headcount
    const { data: headcountData, isLoading: headercountLoading } = useQuery({
        queryKey: ['reports', 'headcount'],
        queryFn: async () => {
            const res = await apiClient.get('/reports/headcount');
            return res.data;
        }
    });

    // Fetch Attrition
    const { data: attritionData, isLoading: attritionLoading } = useQuery({
        queryKey: ['reports', 'attrition'],
        queryFn: async () => {
            const res = await apiClient.get('/reports/attrition');
            return res.data;
        }
    });

    // Fetch Leave Utilization
    const { data: leaveData, isLoading: leaveLoading } = useQuery({
        queryKey: ['reports', 'leave-utilization'],
        queryFn: async () => {
            const res = await apiClient.get('/reports/leave-utilization');
            return res.data;
        }
    });

    // Fetch Salary Metrics (SUPER_ADMIN only)
    const { data: salaryMetrics, isLoading: salaryLoading } = useQuery({
        queryKey: ['reports', 'salary-metrics'],
        queryFn: async () => {
            const res = await apiClient.get('/reports/salary-metrics');
            return res.data;
        },
        enabled: isSuperAdmin,
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

    const handleCsvExport = () => {
        if (activeTab === '1') {
            const rows = headcountData?.byDepartment
                ? Object.entries(headcountData.byDepartment).map(([Department, Headcount]) => ({ Department, Headcount }))
                : [];
            exportToCsv('headcount_report', rows);
        } else if (activeTab === '2') {
            exportToCsv('attrition_report', [{
                Leavers: attritionData?.leavers ?? 0,
                Joiners: attritionData?.joiners ?? 0,
                'Current Active': attritionData?.currentActive ?? 0,
                'Attrition Rate': attritionData?.rate ?? '0%',
            }]);
        } else if (activeTab === '3') {
            exportToCsv('leave_utilization_report', [{
                'Total Entitled': leaveData?.totalEntitled ?? 0,
                'Total Used': leaveData?.totalUsed ?? 0,
                'Avg Taken (days)': leaveData?.avgTaken ?? 0,
            }]);
        } else if (activeTab === '5') {
            const rows = (salaryMetrics?.employees ?? []).map((e: any) => ({
                'Employee Code': e.employeeCode,
                Name: e.name,
                Department: e.department,
                Designation: e.designation ?? '-',
                'CTC (Monthly)': e.ctc,
                'In-Hand (Monthly)': e.inHandSalary,
            }));
            exportToCsv('salary_metrics_report', rows);
        }
    };

    const handlePdfExport = async () => {
        if (activeTab === '1') {
            const rows = headcountData?.byDepartment
                ? Object.entries(headcountData.byDepartment).map(([name, count]) => [name, count])
                : [];
            await exportToPdf('Headcount Report', ['Department', 'Headcount'], rows as any);
        } else if (activeTab === '2') {
            await exportToPdf('Attrition Report', ['Metric', 'Value'], [
                ['Leavers', attritionData?.leavers ?? 0],
                ['Joiners', attritionData?.joiners ?? 0],
                ['Current Active', attritionData?.currentActive ?? 0],
                ['Attrition Rate', String(attritionData?.rate ?? '0%')],
            ]);
        } else if (activeTab === '3') {
            await exportToPdf('Leave Utilization Report', ['Metric', 'Value'], [
                ['Total Entitled (days)', leaveData?.totalEntitled ?? 0],
                ['Total Used (days)', leaveData?.totalUsed ?? 0],
                ['Avg Taken (days/employee)', leaveData?.avgTaken ?? 0],
            ]);
        } else if (activeTab === '5') {
            const rows = (salaryMetrics?.employees ?? []).map((e: any) => [
                e.employeeCode, e.name, e.department, e.designation ?? '-', e.ctc, e.inHandSalary,
            ]);
            await exportToPdf('Salary Metrics Report',
                ['Code', 'Name', 'Department', 'Designation', 'CTC', 'In-Hand'],
                rows
            );
        }
    };

    const operations = (
        <div className="flex gap-2">
            <Button icon={<DownloadOutlined />} size="small" onClick={handlePdfExport} className="text-slate-600 border-slate-300 hover:text-slate-900">PDF</Button>
            <Button icon={<DownloadOutlined />} size="small" onClick={handleCsvExport} className="text-slate-600 border-slate-300 hover:text-slate-900">CSV</Button>
        </div>
    );

    const ReportLayout = ({ title, icon, value, desc, loading, children }: { title: string, icon: React.ReactNode, value: string | number, desc: string, loading: boolean, children: React.ReactNode }) => (
        <div className="p-6 flex flex-col md:flex-row gap-8 items-center justify-center min-h-[400px] border border-dashed border-slate-200 rounded-lg bg-slate-50/50 relative">
            {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"><Spin size="large" /></div>}

            <div className="flex flex-col items-center justify-center w-64 md:border-r border-slate-200 pr-0 md:pr-8 mx-auto self-stretch">
                <div className="text-5xl text-slate-600 mb-6">{icon}</div>
                <Statistic title={<span className="text-slate-500 font-medium">{title}</span>} value={value} valueStyle={{ color: '#E00C05', fontSize: '36px', fontWeight: 'bold' }} />
                <Text className="text-slate-500 mt-2 block text-center bg-white px-3 py-1 rounded-full border border-slate-200 text-sm shadow-sm">{desc}</Text>
            </div>

            <div className="flex-1 w-full h-[300px]">
                {children}
            </div>
        </div>
    );

    // Department breakdown columns
    const deptColumns = [
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (text: string) => <span className="font-medium">{text || 'Unassigned'}</span>,
        },
        {
            title: 'Employees',
            dataIndex: 'employeeCount',
            key: 'employeeCount',
        },
        {
            title: 'Total CTC (Monthly)',
            dataIndex: 'totalCtc',
            key: 'totalCtc',
            render: (val: number) => <span className="font-mono">{formatCurrency(val)}</span>,
        },
        {
            title: 'Total In-Hand (Monthly)',
            dataIndex: 'totalInHand',
            key: 'totalInHand',
            render: (val: number) => <span className="font-mono text-green-700">{formatCurrency(val)}</span>,
        },
        {
            title: 'Avg CTC',
            dataIndex: 'avgCtc',
            key: 'avgCtc',
            render: (val: number) => <span className="font-mono text-slate-500">{formatCurrency(val)}</span>,
        },
    ];

    const deptData = useMemo(() => {
        if (!salaryMetrics?.byDepartment) return [];
        return Object.entries(salaryMetrics.byDepartment).map(([dept, data]: [string, any]) => ({
            department: dept,
            employeeCount: data.headcount,
            totalCtc: data.totalCtc,
            totalInHand: data.totalInHand,
            avgCtc: data.headcount ? data.totalCtc / data.headcount : 0,
        }));
    }, [salaryMetrics]);

    // Individual employee salary columns
    const empSalaryColumns = [
        {
            title: 'Employee',
            key: 'employee',
            render: (_: any, r: any) => (
                <div>
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{r.employeeCode}</div>
                </div>
            ),
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (text: string) => text || '-',
        },
        {
            title: 'Designation',
            dataIndex: 'designation',
            key: 'designation',
            render: (text: string) => text || '-',
        },
        {
            title: 'CTC (Monthly)',
            dataIndex: 'ctc',
            key: 'ctc',
            render: (val: number) => <span className="font-mono">{val ? formatCurrency(val) : '-'}</span>,
        },
        {
            title: 'In-Hand (Monthly)',
            dataIndex: 'inHandSalary',
            key: 'inHandSalary',
            render: (val: number) => <span className="font-mono text-green-700">{val ? formatCurrency(val) : '-'}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => (
                <Tag color={s === 'ACTIVE' ? 'success' : 'warning'} className="border-none">
                    {s?.replace('_', ' ')}
                </Tag>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <Title level={3} className="!mb-1">HR Reports &amp; Analytics</Title>
                    <Text className="text-slate-500">Gain insights into workforce metrics and trends.</Text>
                </div>
            </div>

            <Card bordered={false} className="shadow-sm p-2">
                <Tabs defaultActiveKey="1" tabBarExtraContent={operations} onChange={setActiveTab}>
                    <Tabs.TabPane tab="Headcount" key="1">
                        <ReportLayout
                            title="Active Headcount"
                            value={headcountData?.total || 0}
                            desc={`+${headcountData?.growth || 0}% vs Last Year`}
                            icon={<BarChartOutlined />}
                            loading={headercountLoading}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={headcountData?.byDepartment ? Object.entries(headcountData.byDepartment).map(([name, count]) => ({ name, count })) : []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="count" fill="#1a56db" radius={[4, 4, 0, 0]} barSize={40} name="Headcount" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportLayout>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Attrition" key="2">
                        <ReportLayout
                            title="Annual Attrition Rate"
                            value={`${attritionData?.rate || 0}%`}
                            desc={`${attritionData?.trend || 0}% vs Last Year`}
                            icon={<LineChartOutlined />}
                            loading={attritionLoading}
                        >
                            <div className="flex w-full h-full items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Leavers', value: attritionData?.leavers || 0 },
                                                { name: 'Active', value: attritionData?.currentActive || 0 }
                                            ]}
                                            cx="50%" cy="50%"
                                            innerRadius={80} outerRadius={110}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            <Cell key="cell-0" fill="#E00C05" />
                                            <Cell key="cell-1" fill="#16a34a" />
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </ReportLayout>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Leave Utilization" key="3">
                        <ReportLayout
                            title="Avg Leaves Taken"
                            value={`${leaveData?.avgTaken || 0} days`}
                            desc="Per employee YTD"
                            icon={<PieChartOutlined />}
                            loading={leaveLoading}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Entitled/Allocated', value: leaveData?.totalEntitled || 0 },
                                    { name: 'Taken/Used', value: leaveData?.totalUsed || 0 },
                                ]} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#0f172a', fontSize: 13, fontWeight: 500 }} />
                                    <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" name="Days" radius={[0, 4, 4, 0]}>
                                        {[{ name: 'Entitled/Allocated', value: leaveData?.totalEntitled || 0 }, { name: 'Taken/Used', value: leaveData?.totalUsed || 0 }].map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#1a56db' : '#d97706'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ReportLayout>
                    </Tabs.TabPane>

                    {/* Salary Metrics — SUPER_ADMIN only */}
                    {isSuperAdmin && (
                        <Tabs.TabPane tab={<span><DollarOutlined className="mr-1" />Salary Metrics</span>} key="5">
                            {salaryLoading ? (
                                <div className="flex justify-center py-16"><Spin size="large" /></div>
                            ) : (
                                <div className="flex flex-col gap-6 py-4">
                                    {/* Summary Cards */}
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} sm={12} lg={6}>
                                            <Card bordered={false} className="bg-slate-50 border border-slate-100">
                                                <Statistic
                                                    title={<span className="text-slate-500 text-sm">Total Monthly CTC</span>}
                                                    value={formatCurrency(salaryMetrics?.summary?.totalAnnualCtc ?? 0)}
                                                    valueStyle={{ color: '#0f172a', fontSize: '20px' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} lg={6}>
                                            <Card bordered={false} className="bg-slate-50 border border-slate-100">
                                                <Statistic
                                                    title={<span className="text-slate-500 text-sm">Monthly In-Hand Payout</span>}
                                                    value={formatCurrency(salaryMetrics?.summary?.totalMonthlyInHand ?? 0)}
                                                    valueStyle={{ color: '#16a34a', fontSize: '20px' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} lg={6}>
                                            <Card bordered={false} className="bg-slate-50 border border-slate-100">
                                                <Statistic
                                                    title={<span className="text-slate-500 text-sm">Average CTC / Employee</span>}
                                                    value={formatCurrency(salaryMetrics?.summary?.averageCtcPerEmployee ?? 0)}
                                                    valueStyle={{ color: '#0f172a', fontSize: '20px' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12} lg={6}>
                                            <Card bordered={false} className="bg-slate-50 border border-slate-100">
                                                <Statistic
                                                    title={<span className="text-slate-500 text-sm">Employees Count</span>}
                                                    value={salaryMetrics?.summary?.totalActiveEmployees ?? 0}
                                                    valueStyle={{ color: '#0f172a', fontSize: '20px' }}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>

                                    {/* Department Breakdown */}
                                    {deptData.length > 0 && (
                                        <Card
                                            title="By Department"
                                            bordered={false}
                                            className="border border-slate-100"
                                            headStyle={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Table
                                                columns={deptColumns}
                                                dataSource={deptData}
                                                rowKey="department"
                                                pagination={false}
                                                size="small"
                                                className="custom-table"
                                            />
                                        </Card>
                                    )}

                                    {/* Individual Employee Salaries */}
                                    {salaryMetrics?.employees?.length > 0 && (
                                        <Card
                                            title="Individual Salary Breakdown"
                                            bordered={false}
                                            className="border border-slate-100"
                                            headStyle={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Table
                                                columns={empSalaryColumns}
                                                dataSource={salaryMetrics.employees}
                                                rowKey="id"
                                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                                size="small"
                                                className="custom-table"
                                            />
                                        </Card>
                                    )}
                                </div>
                            )}
                        </Tabs.TabPane>
                    )}
                </Tabs>
            </Card>
        </div>
    );
}
