import { useState } from 'react';
import { Typography, Card, Table, Button, Tag, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const MONTHS = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({ label: String(currentYear - i), value: currentYear - i }));

export default function PayrollRuns() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();
    const [modalOpen, setModalOpen] = useState(false);

    const { data: runs = [], isLoading } = useQuery({
        queryKey: ['payroll', 'runs'],
        queryFn: async () => {
            const res = await apiClient.get('/payroll/runs');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => apiClient.post('/payroll/runs', values),
        onSuccess: () => {
            message.success('Payroll run created');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setModalOpen(false);
            form.resetFields();
        },
        onError: (err: any) => message.error(err.response?.data?.error || 'Failed to create payroll run'),
    });

    const finalizeMutation = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/payroll/runs/${id}/finalize`),
        onSuccess: () => {
            message.success('Payroll run finalized');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
        },
        onError: (err: any) => message.error(err.response?.data?.error || 'Failed to finalize run'),
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const monthName = (m: number) => MONTHS.find(x => x.value === m)?.label ?? String(m);

    const columns = [
        {
            title: 'Period',
            key: 'period',
            render: (_: any, r: any) => <span className="font-medium">{monthName(r.month)} {r.year}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag color={s === 'FINALIZED' ? 'success' : 'warning'}>{s}</Tag>,
        },
        {
            title: 'Employees',
            dataIndex: 'employeeCount',
            render: (v: number) => v ?? '-',
        },
        {
            title: 'Total Net Pay',
            dataIndex: 'totalNetPay',
            render: (v: number) => <span className="font-mono">{v !== undefined ? formatINR(v) : '-'}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, r: any) => (
                <div className="flex gap-2">
                    <Button size="small" onClick={() => navigate(`/payroll/${r.id}`)}>View</Button>
                    {r.status === 'DRAFT' && (
                        <Popconfirm
                            title="Finalize this payroll run?"
                            description="This cannot be undone. Payslips will be locked."
                            onConfirm={() => finalizeMutation.mutate(r.id)}
                            okText="Finalize"
                            okType="danger"
                        >
                            <Button size="small" danger loading={finalizeMutation.isPending}>Finalize</Button>
                        </Popconfirm>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <Title level={3} className="!mb-1">Payroll</Title>
                    <Text className="text-slate-500">Manage monthly payroll runs and payslips.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
                    Run Payroll
                </Button>
            </div>

            <Card bordered={false} className="shadow-sm">
                <Table
                    columns={columns}
                    dataSource={runs}
                    rowKey="id"
                    loading={isLoading}
                    pagination={false}
                    className="custom-table"
                />
            </Card>

            <Modal
                title="Create Payroll Run"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={createMutation.isPending}
                okText="Generate Payslips"
            >
                <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)} className="mt-4">
                    <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                        <Select options={MONTHS} placeholder="Select month" />
                    </Form.Item>
                    <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                        <Select options={YEARS} placeholder="Select year" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
