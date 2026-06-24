import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
    const { school } = useAuth();

    return (
        <div className="dashboard-layout">
            <Sidebar schoolName={school?.name} />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
