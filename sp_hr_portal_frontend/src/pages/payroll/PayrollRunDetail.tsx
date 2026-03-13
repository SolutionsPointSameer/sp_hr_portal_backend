import { Typography, Card, Table, Tag, Button, Spin, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { exportToCsv, exportToPdf } from '../../utils/export';

const { Title, Text } = Typography;

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollRunDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: run, isLoading } = useQuery({
        queryKey: ['payroll', 'run', id],
        queryFn: async () => {
            const res = await apiClient.get(`/payroll/runs/${id}`);
            return res.data;
        },
        enabled: !!id,
    });

    const finalizeMutation = useMutation({
        mutationFn: async () => apiClient.patch(`/payroll/runs/${id}/finalize`),
        onSuccess: () => {
            message.success('Payroll run finalized');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'run', id] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
        },
        onError: (err: any) => message.error(err.response?.data?.error || 'Failed to finalize'),
    });

    const formatINR = (v: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0);

    const handleCsvExport = () => {
        const rows = (run?.payslips ?? []).map((p: any) => ({
            'Employee Code': p.employee.employeeCode,
            'Name': `${p.employee.firstName} ${p.employee.lastName}`,
            'Department': p.employee.department?.name ?? '-',
            'Designation': p.employee.designation?.name ?? '-',
            'Gross': Number(p.gross),
            'Deductions': Number(p.deductions),
            'Net Pay': Number(p.netPay),
        }));
        exportToCsv(`payroll_${run?.month}_${run?.year}`, rows);
    };

    const handlePdfExport = async () => {
        const rows = (run?.payslips ?? []).map((p: any) => [
            p.employee.employeeCode,
            `${p.employee.firstName} ${p.employee.lastName}`,
            p.employee.department?.name ?? '-',
            Number(p.gross),
            Number(p.deductions),
            Number(p.netPay),
        ]);
        await exportToPdf(
            `Payroll ${MONTHS[run?.month ?? 0]} ${run?.year ?? ''}`,
            ['Code', 'Name', 'Department', 'Gross', 'Deductions', 'Net Pay'],
            rows
        );
    };

    const columns = [
        {
            title: 'Employee',
            key: 'employee',
            render: (_: any, r: any) => (
                <div>
                    <div className="font-medium">{r.employee.firstName} {r.employee.lastName}</div>
                    <div className="text-xs text-slate-400 font-mono">{r.employee.employeeCode}</div>
                </div>
            ),
        },
        {
            title: 'Department',
            key: 'dept',
            render: (_: any, r: any) => r.employee.department?.name ?? '-',
        },
        {
            title: 'Gross',
            dataIndex: 'gross',
            render: (v: number) => formatINR(v),
        },
        {
            title: 'Deductions',
            dataIndex: 'deductions',
            render: (v: number) => <span className="text-red-600">{formatINR(v)}</span>,
        },
        {
            title: 'Net Pay',
            dataIndex: 'netPay',
            render: (v: number) => <span className="text-green-700 font-semibold">{formatINR(v)}</span>,
        },
    ];

    if (isLoading) return <div className="flex justify-center p-12"><Spin size="large" /></div>;
    if (!run) return <div className="p-12 text-center text-slate-500">Payroll run not found.</div>;

    const totalNet = (run.payslips ?? []).reduce((s: number, p: any) => s + Number(p.netPay), 0);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/payroll')} className="text-slate-500">
                        Back
                    </Button>
                    <div>
                        <Title level={3} className="!mb-0">{MONTHS[run.month]} {run.year} Payroll</Title>
                        <Text className="text-slate-500">{run.payslips?.length ?? 0} employees &bull; Total Net Pay: {formatINR(totalNet)}</Text>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Tag color={run.status === 'FINALIZED' ? 'success' : 'warning'} className="text-sm px-3 py-1">{run.status}</Tag>
                    <Button icon={<DownloadOutlined />} onClick={handlePdfExport}>PDF</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleCsvExport}>CSV</Button>
                    {run.status === 'DRAFT' && (
                        <Popconfirm
                            title="Finalize this payroll run?"
                            description="Payslips will be locked and visible to employees."
                            onConfirm={() => finalizeMutation.mutate()}
                            okText="Finalize"
                            okType="danger"
                        >
                            <Button type="primary" danger loading={finalizeMutation.isPending}>Finalize Run</Button>
                        </Popconfirm>
                    )}
                </div>
            </div>

            <Card bordered={false} className="shadow-sm">
                <Table
                    columns={columns}
                    dataSource={run.payslips ?? []}
                    rowKey="id"
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    className="custom-table"
                />
            </Card>
        </div>
    );
}
