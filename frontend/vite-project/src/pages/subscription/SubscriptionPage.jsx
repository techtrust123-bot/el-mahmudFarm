import { useState } from 'react';
import { FiCheck, FiCreditCard } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

/**
 * Subscription & Billing Page
 */
const SubscriptionPage = () => {
  const [currentPlan, setCurrentPlan] = useState('pro');

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$29',
      period: '/month',
      description: 'Perfect for small farms',
      features: [
        'Up to 100 animals',
        'Basic dashboard',
        'Manual data entry',
        'Email support',
        'Monthly reports',
      ],
      color: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      recommended: false,
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'For growing farms',
      features: [
        'Unlimited animals',
        'Advanced analytics',
        'Auto data sync',
        'Priority support',
        'Weekly reports',
        'Marketplace access',
        'Vet booking',
      ],
      color: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-300 dark:border-green-800',
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For large operations',
      features: [
        'Everything in Pro',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom reporting',
        'API access',
        'On-premise option',
      ],
      color: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      recommended: false,
    },
  ];

  const billingHistory = [
    { id: 1, date: '2024-02-01', plan: 'Professional', amount: '$79.00', status: 'paid' },
    { id: 2, date: '2024-01-01', plan: 'Professional', amount: '$79.00', status: 'paid' },
    { id: 3, date: '2023-12-01', plan: 'Basic', amount: '$29.00', status: 'paid' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plans & Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Choose the perfect plan for your farm</p>
        </div>

        {/* Current Plan */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Current Plan</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                You're on the <span className="font-semibold text-green-600 dark:text-green-400">Professional Plan</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Next billing: March 1, 2024</p>
            </div>
            <Button variant="outline">Manage Plan</Button>
          </div>
        </Card>

        {/* Plans */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <Card
                key={plan.id}
                className={`${plan.color} ${plan.borderColor} border-2 relative`}
                padding="p-6"
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant="success">RECOMMENDED</Badge>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Info */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <FiCheck className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" size={18} />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  <Button
                    variant={
                      currentPlan === plan.id ? 'secondary' :
                      plan.recommended ? 'primary' : 'outline'
                    }
                    fullWidth
                    disabled={currentPlan === plan.id}
                  >
                    {currentPlan === plan.id ? 'Current Plan' : 'Choose Plan'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Billing History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {billingHistory.map(bill => (
                  <tr key={bill.id}>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{bill.date}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{bill.plan}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{bill.amount}</td>
                    <td className="py-3 px-4">
                      <Badge variant="success">{bill.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">Download</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Method */}
        <Card>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Method</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">💳 Visa ending in 4242</p>
            </div>
            <Button variant="outline">Update Payment Method</Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
