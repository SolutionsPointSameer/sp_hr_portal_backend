import { Descriptions, Card, Tabs, Tag, Button, Typography, Avatar, Spin, message, Modal, Form, InputNumber, Table, DatePicker } from 'antd';
import { useState } from 'react';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const { Title } = Typography;

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);

    const canEdit = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

    const { data: employee, isLoading, isError } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            if (id === 'new') return null; // Edge case if 'new' routes here by mistake
            const res = await apiClient.get(`/employees/${id}`);
            return res.data;
        },
        enabled: !!id && id !== 'new',
    });

    if (isError) {
        message.error('Failed to load employee details');
        navigate('/employees');
        return null;
    }

    const deleteMutation = useMutation({
        mutationFn: async () => apiClient.delete(`/employees/${id}`),
        onSuccess: () => {
            message.success('Employee deleted successfully');
            navigate('/employees');
        },
        onError: () => message.error('Failed to delete employee')
    });

    const handleDelete = () => {
        Modal.confirm({
            title: 'Delete Employee',
            content: 'Are you sure you want to permanently delete this employee? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => deleteMutation.mutate()
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Spin size="large" /></div>;
    }

    if (!employee) {
        return <div className="p-12 text-center text-slate-500">Employee not found.</div>;
    }

    const joiningDateStr = employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-';
    const managerName = employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'None';

    const profileItems = [
        { label: 'Employee Code', children: employee.employeeCode },
        { label: 'Email', children: employee.email },
        { label: 'Phone', children: employee.phone || '-' },
        { label: 'Joining Date', children: joiningDateStr },
        { label: 'Status', children: <Tag color={employee.status === 'ACTIVE' ? 'success' : 'warning'}>{employee.status?.replace('_', ' ')}</Tag> },
        { label: 'Type', children: employee.employmentType?.replace('_', ' ') || '-' },
    ];

    const workItems = [
        { label: 'Company', children: employee.company?.name || '-' },
        { label: 'Location', children: employee.location?.name || '-' },
        { label: 'Department', children: employee.department?.name || '-' },
        { label: 'Designation', children: employee.designation?.name || '-' },
        { label: 'Reporting Manager', children: managerName },
    ];

    if (canEdit) {
        workItems.push({ label: 'CTC (Monthly)', children: employee.ctc ? `₹${employee.ctc}` : '-' });
        workItems.push({ label: 'In-Hand Salary (Monthly)', children: employee.inHandSalary ? `₹${employee.inHandSalary}` : '-' });
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/employees')}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        Back
                    </Button>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => navigate(`/employees/${id}/edit`)}
                        >
                            Edit Profile
                        </Button>
                    )}
                    {user?.role === 'SUPER_ADMIN' && (
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleDelete}
                            loading={deleteMutation.isPending}
                        >
                            Delete Employee
                        </Button>
                    )}
                </div>
            </div>

            <Card bordered={false} className="shadow-sm">
                <div className="flex items-center gap-6 mb-8">
                    <Avatar
                        size={80}
                        className="bg-brand-red flex-shrink-0 text-2xl font-bold"
                        style={{ backgroundColor: '#dc2626' }}
                    >
                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Title level={4} className="!mb-0">{employee.firstName} {employee.lastName}</Title>
                            <Tag color="default" className="border-none bg-slate-100 text-slate-600 font-mono text-xs">
                                {employee.employeeCode}
                            </Tag>
                        </div>
                        <div className="text-slate-500 mt-1">
                            {employee.designation?.name || '-'} &bull; {employee.department?.name || '-'}
                        </div>
                        <Tag
                            color={employee.status === 'ACTIVE' ? 'success' : employee.status === 'TERMINATED' ? 'error' : 'warning'}
                            className="border-none mt-2 text-xs"
                        >
                            {employee.status?.replace('_', ' ')}
                        </Tag>
                    </div>
                </div>

                <Tabs defaultActiveKey="1">
                    <Tabs.TabPane tab="Profile" key="1">
                        <div className="max-w-4xl py-4">
                            <Descriptions
                                bordered
                                column={{ xs: 1, sm: 2 }}
                                items={profileItems}
                                className="bg-white rounded-lg overflow-hidden"
                                labelStyle={{ background: '#f8fafc', color: '#64748b', fontWeight: 500 }}
                                contentStyle={{ background: '#ffffff', color: '#0f172a' }}
                            />
                        </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Employment" key="2">
                        <div className="max-w-4xl py-4">
                            <Descriptions
                                bordered
                                column={1}
                                items={workItems}
                                className="bg-white rounded-lg overflow-hidden"
                                labelStyle={{ background: '#f8fafc', color: '#64748b', fontWeight: 500, width: '200px' }}
                                contentStyle={{ background: '#ffffff', color: '#0f172a' }}
                            />
                        </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Documents" key="3">
                        <div className="py-4">
                            {canEdit ? (
                                <EmployeeDocuments employeeId={id!} />
                            ) : (
                                <div className="text-slate-500 italic">
                                    You do not have permission to view documents.
                                </div>
                            )}
                        </div>
                    </Tabs.TabPane>
                    {canEdit && (
                        <Tabs.TabPane tab="Leave Balances" key="4">
                            <div className="py-4">
                                <EmployeeLeaveBalances employeeId={id!} />
                            </div>
                        </Tabs.TabPane>
                    )}
                    {canEdit && (
                        <Tabs.TabPane tab="Salary Structure" key="5">
                            <div className="py-4">
                                <EmployeeSalaryStructures employeeId={id!} />
                            </div>
                        </Tabs.TabPane>
                    )}
                    {user?.id === id && (
                        <Tabs.TabPane tab="My Payslips" key="6">
                            <div className="py-4">
                                <MyPayslips />
                            </div>
                        </Tabs.TabPane>
                    )}
                </Tabs>
            </Card>
        </div>
    );
}

function EmployeeDocuments({ employeeId }: { employeeId: string }) {
    const { data: documents, isLoading, isError } = useQuery({
        queryKey: ['employee-documents', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(`/employees/${employeeId}/documents`);
            return res.data;
        },
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spin /></div>;
    }

    if (isError) {
        return <div className="text-red-500">Failed to load documents.</div>;
    }

    if (!documents || documents.length === 0) {
        return <div className="text-slate-500 italic">No documents uploaded yet.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc: any) => (
                <Card key={doc.id} size="small" className="border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">{doc.type.replace(/_/g, ' ')}</div>
                                <div className="text-xs text-slate-500">
                                    Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {doc.viewUrl && (
                                <Button
                                    type="text"
                                    size="small"
                                    className="text-brand-blue hover:text-blue-700"
                                    onClick={() => window.open(doc.viewUrl, '_blank')}
                                >
                                    View
                                </Button>
                            )}
                            {doc.fileUrl && (
                                <Button
                                    type="text"
                                    size="small"
                                    className="text-slate-600 hover:text-slate-900"
                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                >
                                    Download
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

function EmployeeSalaryStructures({ employeeId }: { employeeId: string }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: structures = [], isLoading } = useQuery({
        queryKey: ['salary-structures', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(`/payroll/salary-structures/${employeeId}`);
            return res.data;
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = {
                ...values,
                employeeId,
                effectiveDate: values.effectiveDate?.format('YYYY-MM-DD'),
                allowances: {
                    conveyance: values.conveyance ?? 0,
                    medical: values.medical ?? 0,
                    special: values.special ?? 0,
                },
                deductions: {
                    pf: values.pf ?? 0,
                    esi: values.esi ?? 0,
                    tds: values.tds ?? 0,
                },
            };
            if (editingId) {
                return apiClient.patch(`/payroll/salary-structures/${editingId}`, payload);
            }
            return apiClient.post('/payroll/salary-structures', payload);
        },
        onSuccess: () => {
            message.success(editingId ? 'Salary structure updated' : 'Salary structure added');
            queryClient.invalidateQueries({ queryKey: ['salary-structures', employeeId] });
            setIsModalVisible(false);
            setEditingId(null);
            form.resetFields();
        },
        onError: () => message.error('Failed to save salary structure'),
    });

    const openModal = (record?: any) => {
        if (record) {
            setEditingId(record.id);
            form.setFieldsValue({
                basic: Number(record.basic),
                hra: Number(record.hra),
                conveyance: record.allowances?.conveyance ?? 0,
                medical: record.allowances?.medical ?? 0,
                special: record.allowances?.special ?? 0,
                pf: record.deductions?.pf ?? 0,
                esi: record.deductions?.esi ?? 0,
                tds: record.deductions?.tds ?? 0,
            });
        } else {
            setEditingId(null);
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const columns = [
        {
            title: 'Effective From',
            dataIndex: 'effectiveDate',
            key: 'effectiveDate',
            render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
        },
        {
            title: 'Basic',
            dataIndex: 'basic',
            key: 'basic',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'HRA',
            dataIndex: 'hra',
            key: 'hra',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'Gross',
            key: 'gross',
            render: (_: any, r: any) => {
                const allowances = Object.values(r.allowances ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                return formatINR(Number(r.basic) + Number(r.hra) + allowances);
            },
        },
        {
            title: 'Deductions',
            key: 'deductions',
            render: (_: any, r: any) => {
                const ded = Object.values(r.deductions ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                return <span className="text-red-600">{formatINR(ded)}</span>;
            },
        },
        {
            title: 'Net Pay',
            key: 'netPay',
            render: (_: any, r: any) => {
                const allowances = Object.values(r.allowances ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                const ded = Object.values(r.deductions ?? {}).reduce((s: number, v) => s + Number(v || 0), 0);
                const net = Number(r.basic) + Number(r.hra) + allowances - ded;
                return <span className="text-green-700 font-semibold">{formatINR(net)}</span>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>Edit</Button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button type="primary" onClick={() => openModal()}>Add Salary Structure</Button>
            </div>
            {isLoading ? (
                <div className="flex justify-center p-8"><Spin /></div>
            ) : structures.length === 0 ? (
                <div className="text-slate-500 italic">No salary structure defined yet.</div>
            ) : (
                <Table
                    columns={columns}
                    dataSource={structures}
                    rowKey="id"
                    pagination={false}
                    className="custom-table border border-slate-200 rounded-lg"
                />
            )}

            <Modal
                title={editingId ? 'Edit Salary Structure' : 'Add Salary Structure'}
                open={isModalVisible}
                onCancel={() => { setIsModalVisible(false); form.resetFields(); setEditingId(null); }}
                onOk={() => form.submit()}
                confirmLoading={saveMutation.isPending}
            >
                <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} className="mt-4">
                    {!editingId && (
                        <Form.Item name="effectiveDate" label="Effective From" rules={[{ required: true }]}>
                            <DatePicker className="w-full" />
                        </Form.Item>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item name="basic" label="Basic (₹/mo)" rules={[{ required: true }]}>
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="hra" label="HRA (₹/mo)" rules={[{ required: true }]}>
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Allowances</div>
                    <div className="grid grid-cols-3 gap-3">
                        <Form.Item name="conveyance" label="Conveyance">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="medical" label="Medical">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="special" label="Special">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Deductions</div>
                    <div className="grid grid-cols-3 gap-3">
                        <Form.Item name="pf" label="PF">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="esi" label="ESI">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item name="tds" label="TDS">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function MyPayslips() {
    const { data: payslips = [], isLoading } = useQuery({
        queryKey: ['my-payslips'],
        queryFn: async () => {
            const res = await apiClient.get('/payroll/my-payslips');
            return res.data;
        },
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const columns = [
        {
            title: 'Period',
            key: 'period',
            render: (_: any, r: any) => `${MONTHS[r.payrollRun.month]} ${r.payrollRun.year}`,
        },
        {
            title: 'Gross',
            dataIndex: 'gross',
            render: (v: number) => formatINR(Number(v)),
        },
        {
            title: 'Deductions',
            dataIndex: 'deductions',
            render: (v: number) => <span className="text-red-600">{formatINR(Number(v))}</span>,
        },
        {
            title: 'Net Pay',
            dataIndex: 'netPay',
            render: (v: number) => <span className="text-green-700 font-semibold">{formatINR(Number(v))}</span>,
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, r: any) => (
                <Tag color={r.payrollRun.status === 'FINALIZED' ? 'success' : 'warning'}>
                    {r.payrollRun.status}
                </Tag>
            ),
        },
    ];

    if (isLoading) return <div className="flex justify-center p-8"><Spin /></div>;
    if (payslips.length === 0) return <div className="text-slate-500 italic">No payslips available yet.</div>;

    return (
        <Table
            columns={columns}
            dataSource={payslips}
            rowKey="id"
            pagination={{ pageSize: 12 }}
            className="custom-table border border-slate-200 rounded-lg"
        />
    );
}

function EmployeeLeaveBalances({ employeeId }: { employeeId: string }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingBalance, setEditingBalance] = useState<any>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: balances, isLoading, isError } = useQuery({
        queryKey: ['employee-balances', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(`/leave/balances/${employeeId}`);
            return res.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => apiClient.patch(`/leave/balances/${id}`, data),
        onSuccess: () => {
            message.success('Leave balance updated successfully');
            queryClient.invalidateQueries({ queryKey: ['employee-balances', employeeId] });
            closeModal();
        },
        onError: () => message.error('Failed to update leave balance')
    });

    const openModal = (balance: any) => {
        setEditingBalance(balance);
        form.setFieldsValue({
            entitled: balance.entitled,
            used: balance.used,
            remaining: balance.remaining,
        });
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setEditingBalance(null);
        form.resetFields();
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        if ('entitled' in changedValues || 'used' in changedValues) {
            const ent = allValues.entitled || 0;
            const us = allValues.used || 0;
            form.setFieldsValue({ remaining: Math.max(0, ent - us) });
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            updateMutation.mutate({ id: editingBalance.id, data: values });
        } catch (error) {
            // form validation error
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Spin /></div>;
    if (isError) return <div className="text-red-500">Failed to load leave balances.</div>;

    const columns = [
        {
            title: 'Leave Type',
            dataIndex: ['leaveType', 'name'],
            key: 'name',
            render: (text: string) => <span className="font-medium text-slate-800">{text}</span>
        },
        {
            title: 'Total Quota',
            dataIndex: 'entitled',
            key: 'entitled',
        },
        {
            title: 'Used',
            dataIndex: 'used',
            key: 'used',
        },
        {
            title: 'Remaining',
            dataIndex: 'remaining',
            key: 'remaining',
            render: (v: number) => <span className={v > 0 ? 'text-green-600 font-medium' : 'text-slate-400'}>{v}</span>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => openModal(record)}>
                    Adjust
                </Button>
            )
        }
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={balances}
                rowKey="id"
                pagination={false}
                className="custom-table shadow-sm border border-slate-200 rounded-lg overflow-hidden"
            />
            <Modal
                title={`Adjust Balance: ${editingBalance?.leaveType?.name}`}
                open={isModalVisible}
                onOk={handleSubmit}
                onCancel={closeModal}
                confirmLoading={updateMutation.isPending}
            >
                <Form form={form} layout="vertical" className="mt-4" onValuesChange={handleValuesChange}>
                    <Form.Item label="Total Quota (Entitled)" name="entitled" rules={[{ required: true }]}>
                        <InputNumber min={0} className="w-full" />
                    </Form.Item>
                    <Form.Item label="Days Used" name="used" rules={[{ required: true }]}>
                        <InputNumber min={0} className="w-full" />
                    </Form.Item>
                    <Form.Item label="Days Remaining" name="remaining" rules={[{ required: true }]}>
                        <InputNumber className="w-full" disabled />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
