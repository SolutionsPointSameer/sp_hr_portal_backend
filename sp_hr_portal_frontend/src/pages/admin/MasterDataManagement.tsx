import { useState, useEffect } from 'react';
import {
    Typography, Card, Table, Button, Tabs, Modal, Form,
    Input, InputNumber, Select, Switch, message, Space
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';

const { Title, Text } = Typography;

interface Department {
    id: string;
    name: string;
}

interface Designation {
    id: string;
    name: string;
    level: number;
    departmentId: string;
    department?: Department;
}

interface Company {
    id: string;
    name: string;
}

interface Location {
    id: string;
    name: string;
}

interface LeaveType {
    id: string;
    name: string;
    annualQuota: number;
    carryForwardLimit: number;
    isPaid: boolean;
}

export default function MasterDataManagement() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loadingDeps, setLoadingDeps] = useState(false);
    const [loadingDesigs, setLoadingDesigs] = useState(false);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Modal states
    const [isDepModalOpen, setIsDepModalOpen] = useState(false);
    const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [editingDep, setEditingDep] = useState<Department | null>(null);
    const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    const [depForm] = Form.useForm();
    const [desigForm] = Form.useForm();
    const [companyForm] = Form.useForm();
    const [locationForm] = Form.useForm();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
    const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
    const [leaveTypeForm] = Form.useForm();

    const fetchDepartments = async () => {
        setLoadingDeps(true);
        try {
            const res = await apiClient.get('/departments');
            setDepartments(res.data);
        } catch (error) {
            message.error('Failed to load departments');
        } finally {
            setLoadingDeps(false);
        }
    };

    const fetchDesignations = async () => {
        setLoadingDesigs(true);
        try {
            const res = await apiClient.get('/designations');
            setDesignations(res.data);
        } catch (error) {
            message.error('Failed to load designations');
        } finally {
            setLoadingDesigs(false);
        }
    };

    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const res = await apiClient.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            message.error('Failed to load companies');
        } finally {
            setLoadingCompanies(false);
        }
    };

    const fetchLocations = async () => {
        setLoadingLocations(true);
        try {
            const res = await apiClient.get('/locations');
            setLocations(res.data);
        } catch (error) {
            message.error('Failed to load locations');
        } finally {
            setLoadingLocations(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
        fetchDesignations();
        fetchCompanies();
        fetchLocations();
        fetchLeaveTypes();
    }, []);

    // Department Handlers
    const handleDepSubmit = async (values: any) => {
        try {
            if (editingDep) {
                await apiClient.patch(`/departments/${editingDep.id}`, values);
                message.success('Department updated successfully');
            } else {
                await apiClient.post('/departments', values);
                message.success('Department added successfully');
            }
            setIsDepModalOpen(false);
            depForm.resetFields();
            setEditingDep(null);
            fetchDepartments();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save department');
        }
    };

    const openEditDepModal = (record: Department) => {
        setEditingDep(record);
        depForm.setFieldsValue({ name: record.name });
        setIsDepModalOpen(true);
    };

    // Designation Handlers
    const handleDesigSubmit = async (values: any) => {
        try {
            if (editingDesig) {
                await apiClient.patch(`/designations/${editingDesig.id}`, values);
                message.success('Designation updated successfully');
            } else {
                await apiClient.post('/designations', values);
                message.success('Designation added successfully');
            }
            setIsDesigModalOpen(false);
            desigForm.resetFields();
            setEditingDesig(null);
            fetchDesignations();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save designation');
        }
    };

    const openEditDesigModal = (record: Designation) => {
        setEditingDesig(record);
        desigForm.setFieldsValue({
            name: record.name,
            level: record.level,
            departmentId: record.departmentId
        });
        setIsDesigModalOpen(true);
    };

    // Company Handlers
    const handleCompanySubmit = async (values: any) => {
        try {
            if (editingCompany) {
                await apiClient.patch(`/companies/${editingCompany.id}`, values);
                message.success('Company updated successfully');
            } else {
                await apiClient.post('/companies', values);
                message.success('Company added successfully');
            }
            setIsCompanyModalOpen(false);
            companyForm.resetFields();
            setEditingCompany(null);
            fetchCompanies();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save company');
        }
    };

    const openEditCompanyModal = (record: Company) => {
        setEditingCompany(record);
        companyForm.setFieldsValue({ name: record.name });
        setIsCompanyModalOpen(true);
    };

    // Location Handlers
    const handleLocationSubmit = async (values: any) => {
        try {
            if (editingLocation) {
                await apiClient.patch(`/locations/${editingLocation.id}`, values);
                message.success('Location updated successfully');
            } else {
                await apiClient.post('/locations', values);
                message.success('Location added successfully');
            }
            setIsLocationModalOpen(false);
            locationForm.resetFields();
            setEditingLocation(null);
            fetchLocations();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save location');
        }
    };

    const openEditLocationModal = (record: Location) => {
        setEditingLocation(record);
        locationForm.setFieldsValue({ name: record.name });
        setIsLocationModalOpen(true);
    };

    const fetchLeaveTypes = async () => {
        setLoadingLeaveTypes(true);
        try {
            const res = await apiClient.get('/leave/types');
            setLeaveTypes(res.data);
        } catch {
            message.error('Failed to load leave types');
        } finally {
            setLoadingLeaveTypes(false);
        }
    };

    const handleLeaveTypeSubmit = async (values: any) => {
        try {
            if (editingLeaveType) {
                await apiClient.patch(`/leave/types/${editingLeaveType.id}`, values);
                message.success('Leave type updated successfully');
            } else {
                await apiClient.post('/leave/types', values);
                message.success('Leave type added successfully');
            }
            setIsLeaveTypeModalOpen(false);
            leaveTypeForm.resetFields();
            setEditingLeaveType(null);
            fetchLeaveTypes();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Failed to save leave type');
        }
    };

    const openEditLeaveTypeModal = (record: LeaveType) => {
        setEditingLeaveType(record);
        leaveTypeForm.setFieldsValue({
            name: record.name,
            annualQuota: record.annualQuota,
            carryForwardLimit: record.carryForwardLimit,
            isPaid: record.isPaid,
        });
        setIsLeaveTypeModalOpen(true);
    };

    const leaveTypeColumns = [
        { title: 'Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
        { title: 'Annual Quota (days)', dataIndex: 'annualQuota', key: 'annualQuota' },
        { title: 'Carry-Forward Limit', dataIndex: 'carryForwardLimit', key: 'carryForwardLimit' },
        {
            title: 'Paid Leave',
            dataIndex: 'isPaid',
            key: 'isPaid',
            render: (v: boolean) => v
                ? <span className="text-green-600 font-medium">Yes</span>
                : <span className="text-slate-400">No</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: LeaveType) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditLeaveTypeModal(record)}>Edit</Button>
                </Space>
            ),
        },
    ];

    const depColumns = [
        { title: 'Department Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Department) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditDepModal(record)}
                    >
                        Edit
                    </Button>
                </Space>
            )
        }
    ];

    const desigColumns = [
        { title: 'Designation Title', dataIndex: 'name', key: 'name', className: 'font-medium' },
        { title: 'Level', dataIndex: 'level', key: 'level' },
        {
            title: 'Department',
            key: 'department',
            render: (_: any, record: Designation) => record.department?.name || '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Designation) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditDesigModal(record)}
                    >
                        Edit
                    </Button>
                </Space>
            )
        }
    ];

    const companyColumns = [
        { title: 'Company Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Company) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditCompanyModal(record)}
                    >
                        Edit
                    </Button>
                </Space>
            )
        }
    ];

    const locationColumns = [
        { title: 'Location Name', dataIndex: 'name', key: 'name', className: 'font-medium' },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Location) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditLocationModal(record)}
                    >
                        Edit
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <Title level={3} className="!mb-1">Master Data Management</Title>
                    <Text className="text-slate-500">Manage foundational entities like Departments and Designations.</Text>
                </div>
            </div>

            <Card bordered={false} className="shadow-sm p-0 overflow-hidden">
                <Tabs
                    defaultActiveKey="departments"
                    className="master-data-tabs px-6 py-2"
                >
                    <Tabs.TabPane tab="Departments" key="departments">
                        <div className="flex justify-end mb-4">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingDep(null);
                                    depForm.resetFields();
                                    setIsDepModalOpen(true);
                                }}
                            >
                                Add Department
                            </Button>
                        </div>
                        <Table
                            columns={depColumns}
                            dataSource={departments}
                            rowKey="id"
                            loading={loadingDeps}
                            pagination={false}
                            className="custom-table border border-slate-200 rounded-lg"
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Designations" key="designations">
                        <div className="flex justify-end mb-4">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingDesig(null);
                                    desigForm.resetFields();
                                    setIsDesigModalOpen(true);
                                }}
                            >
                                Add Designation
                            </Button>
                        </div>
                        <Table
                            columns={desigColumns}
                            dataSource={designations}
                            rowKey="id"
                            loading={loadingDesigs}
                            pagination={false}
                            className="custom-table border border-slate-200 rounded-lg"
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Companies" key="companies">
                        <div className="flex justify-end mb-4">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingCompany(null);
                                    companyForm.resetFields();
                                    setIsCompanyModalOpen(true);
                                }}
                            >
                                Add Company
                            </Button>
                        </div>
                        <Table
                            columns={companyColumns}
                            dataSource={companies}
                            rowKey="id"
                            loading={loadingCompanies}
                            pagination={false}
                            className="custom-table border border-slate-200 rounded-lg"
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Locations" key="locations">
                        <div className="flex justify-end mb-4">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingLocation(null);
                                    locationForm.resetFields();
                                    setIsLocationModalOpen(true);
                                }}
                            >
                                Add Location
                            </Button>
                        </div>
                        <Table
                            columns={locationColumns}
                            dataSource={locations}
                            rowKey="id"
                            loading={loadingLocations}
                            pagination={false}
                            className="custom-table border border-slate-200 rounded-lg"
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Leave Types" key="leave-types">
                        <div className="flex justify-end mb-4">
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingLeaveType(null);
                                    leaveTypeForm.resetFields();
                                    leaveTypeForm.setFieldsValue({ isPaid: true, carryForwardLimit: 0, annualQuota: 1 });
                                    setIsLeaveTypeModalOpen(true);
                                }}
                            >
                                Add Leave Type
                            </Button>
                        </div>
                        <Table
                            columns={leaveTypeColumns}
                            dataSource={leaveTypes}
                            rowKey="id"
                            loading={loadingLeaveTypes}
                            pagination={false}
                            className="custom-table border border-slate-200 rounded-lg"
                        />
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            {/* Department Modal */}
            <Modal
                title={editingDep ? "Edit Department" : "Add New Department"}
                open={isDepModalOpen}
                onCancel={() => setIsDepModalOpen(false)}
                footer={null}
            >
                <Form
                    form={depForm}
                    layout="vertical"
                    onFinish={handleDepSubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Department Name"
                        rules={[{ required: true, message: 'Please enter department name' }]}
                    >
                        <Input placeholder="e.g. Engineering" />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsDepModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </div>
                </Form>
            </Modal>

            {/* Designation Modal */}
            <Modal
                title={editingDesig ? "Edit Designation" : "Add New Designation"}
                open={isDesigModalOpen}
                onCancel={() => setIsDesigModalOpen(false)}
                footer={null}
            >
                <Form
                    form={desigForm}
                    layout="vertical"
                    onFinish={handleDesigSubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Designation Title"
                        rules={[{ required: true, message: 'Please enter title' }]}
                    >
                        <Input placeholder="e.g. Software Engineer" />
                    </Form.Item>
                    <Form.Item
                        name="level"
                        label="Job Level"
                        rules={[{ required: true, message: 'Please enter a level' }]}
                    >
                        <InputNumber className="w-full" min={1} max={10} placeholder="1-10" />
                    </Form.Item>
                    <Form.Item
                        name="departmentId"
                        label="Department"
                        rules={[{ required: true, message: 'Please select a department' }]}
                    >
                        <Select
                            placeholder="Select Department"
                            loading={loadingDeps}
                            options={departments.map(d => ({ label: d.name, value: d.id }))}
                        />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsDesigModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </div>
                </Form>
            </Modal>

            {/* Company Modal */}
            <Modal
                title={editingCompany ? "Edit Company" : "Add New Company"}
                open={isCompanyModalOpen}
                onCancel={() => setIsCompanyModalOpen(false)}
                footer={null}
            >
                <Form
                    form={companyForm}
                    layout="vertical"
                    onFinish={handleCompanySubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Company Name"
                        rules={[{ required: true, message: 'Please enter company name' }]}
                    >
                        <Input placeholder="e.g. Acme Corp" />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </div>
                </Form>
            </Modal>

            {/* Location Modal */}
            <Modal
                title={editingLocation ? "Edit Location" : "Add New Location"}
                open={isLocationModalOpen}
                onCancel={() => setIsLocationModalOpen(false)}
                footer={null}
            >
                <Form
                    form={locationForm}
                    layout="vertical"
                    onFinish={handleLocationSubmit}
                    className="mt-4"
                >
                    <Form.Item
                        name="name"
                        label="Location Name"
                        rules={[{ required: true, message: 'Please enter location name' }]}
                    >
                        <Input placeholder="e.g. New York, NY" />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsLocationModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </div>
                </Form>
            </Modal>

            {/* Leave Type Modal */}
            <Modal
                title={editingLeaveType ? "Edit Leave Type" : "Add New Leave Type"}
                open={isLeaveTypeModalOpen}
                onCancel={() => setIsLeaveTypeModalOpen(false)}
                footer={null}
            >
                <Form
                    form={leaveTypeForm}
                    layout="vertical"
                    onFinish={handleLeaveTypeSubmit}
                    className="mt-4"
                    initialValues={{ isPaid: true, carryForwardLimit: 0, annualQuota: 1 }}
                >
                    <Form.Item
                        name="name"
                        label="Leave Type Name"
                        rules={[{ required: true, message: 'Please enter a name' }]}
                    >
                        <Input placeholder="e.g. Casual Leave" />
                    </Form.Item>
                    <Form.Item
                        name="annualQuota"
                        label="Annual Quota (days)"
                        rules={[{ required: true, message: 'Please enter annual quota' }]}
                    >
                        <InputNumber className="w-full" min={1} placeholder="e.g. 12" />
                    </Form.Item>
                    <Form.Item
                        name="carryForwardLimit"
                        label="Carry-Forward Limit (days)"
                        rules={[{ required: true, message: 'Please enter carry-forward limit' }]}
                    >
                        <InputNumber className="w-full" min={0} placeholder="0 = no carry-forward" />
                    </Form.Item>
                    <Form.Item name="isPaid" label="Paid Leave" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={() => setIsLeaveTypeModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit">Save</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
