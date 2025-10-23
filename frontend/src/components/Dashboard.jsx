import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [feeSummary, setFeeSummary] = useState({
    monthly_total: 0,
    quarterly_total: 0,
    yearly_total: 0,
    total_members: 0,
    total_payments: 0
  });
  
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    membership_type: 'Basic',
    monthly_fee: ''
  });
  
  const [newPayment, setNewPayment] = useState({
    member_id: '',
    amount: '',
    payment_type: 'monthly',
    notes: ''
  });

  useEffect(() => {
    fetchFeeSummary();
    fetchMembers();
    fetchPayments();
  }, []);

  const fetchFeeSummary = async () => {
    try {
      const response = await axios.get(`${API}/fee-summary`);
      setFeeSummary(response.data);
    } catch (error) {
      console.error('Error fetching fee summary:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/payments`);
      setPayments(response.data.slice(0, 5)); // Show only last 5 payments
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/members`, {
        ...newMember,
        monthly_fee: parseFloat(newMember.monthly_fee)
      });
      setNewMember({ name: '', phone: '', membership_type: 'Basic', monthly_fee: '' });
      fetchMembers();
      fetchFeeSummary();
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payments`, {
        ...newPayment,
        amount: parseFloat(newPayment.amount)
      });
      setNewPayment({ member_id: '', amount: '', payment_type: 'monthly', notes: '' });
      fetchPayments();
      fetchFeeSummary();
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Make sure the member exists.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fitness Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage members and track fee collections</p>
        </div>

        {/* Fee Collection Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Fee Collection Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Collection</CardTitle>
                <CardDescription>Current month</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">₹{feeSummary.monthly_total.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quarterly Collection</CardTitle>
                <CardDescription>Last 3 months</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">₹{feeSummary.quarterly_total.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Yearly Collection</CardTitle>
                <CardDescription>Current year</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">₹{feeSummary.yearly_total.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">{feeSummary.total_members}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-700">{feeSummary.total_payments}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Member Form */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="membership_type">Membership Type</Label>
                    <Input
                      id="membership_type"
                      value={newMember.membership_type}
                      onChange={(e) => setNewMember({ ...newMember, membership_type: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_fee">Monthly Fee (₹)</Label>
                    <Input
                      id="monthly_fee"
                      type="number"
                      value={newMember.monthly_fee}
                      onChange={(e) => setNewMember({ ...newMember, monthly_fee: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full md:w-auto">Add Member</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Record Payment Form */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="member_select">Select Member</Label>
                    <select
                      id="member_select"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={newPayment.member_id}
                      onChange={(e) => setNewPayment({ ...newPayment, member_id: e.target.value })}
                      required
                    >
                      <option value="">Select a member</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.membership_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_type">Payment Type</Label>
                    <select
                      id="payment_type"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={newPayment.payment_type}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_type: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full md:w-auto">Record Payment</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2">Member</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="py-2">{payment.member_name}</td>
                          <td className="py-2">₹{payment.amount}</td>
                          <td className="py-2 capitalize">{payment.payment_type}</td>
                          <td className="py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No payments recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
