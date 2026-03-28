import { useState } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiStar } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

/**
 * Vet Booking - Schedule appointments with veterinarians
 */
const VetBookingPage = () => {
  const [selectedVet, setSelectedVet] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({ date: '', time: '', reason: '' });

  const vets = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Livestock Health',
      rating: 4.8,
      reviews: 127,
      location: 'Central Clinic',
      availability: ['Mon-Fri', '9AM-5PM'],
      image: '👩‍⚕️',
      experience: '12 years',
      consultationFee: '$50',
    },
    {
      id: 2,
      name: 'Dr. Michael Obi',
      specialty: 'Poultry & Avian',
      rating: 4.9,
      reviews: 156,
      location: 'North Veterinary Center',
      availability: ['Tue-Sat', '8AM-6PM'],
      image: '👨‍⚕️',
      experience: '15 years',
      consultationFee: '$45',
    },
    {
      id: 3,
      name: 'Dr. Emily Chen',
      specialty: 'Reproductive Health',
      rating: 4.7,
      reviews: 98,
      location: 'East Clinic',
      availability: ['Mon-Thu', '10AM-4PM'],
      image: '👩‍⚕️',
      experience: '8 years',
      consultationFee: '$55',
    },
  ];

  const appointments = [
    { id: 1, vet: 'Dr. Sarah Johnson', date: '2024-02-28', time: '2:00 PM', status: 'confirmed', reason: 'Regular checkup' },
    { id: 2, vet: 'Dr. Michael Obi', date: '2024-03-05', time: '10:00 AM', status: 'pending', reason: 'Vaccination' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Veterinary Booking</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Schedule appointments with professional veterinarians</p>
        </div>

        {/* My Appointments */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My Appointments</h3>
          <div className="space-y-3">
            {appointments.map(apt => (
              <div key={apt.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{apt.vet}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FiCalendar size={14} /> {apt.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <FiClock size={14} /> {apt.time}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{apt.reason}</p>
                </div>
                <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'}>
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Available Vets */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Available Veterinarians</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vets.map(vet => (
              <Card key={vet.id} hover>
                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="text-6xl text-center">{vet.image}</div>

                  {/* Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{vet.name}</h3>
                    <p className="text-green-600 dark:text-green-400 font-semibold text-sm">{vet.specialty}</p>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            size={14}
                            className={i < Math.floor(vet.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {vet.rating} ({vet.reviews})
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <FiMapPin size={14} />
                        <span>{vet.location}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">🎓 {vet.experience}</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">{vet.consultationFee}</p>
                    </div>

                    {/* Availability */}
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                      {vet.availability.map((avail, i) => (
                        <p key={i} className="text-gray-700 dark:text-gray-300">{avail}</p>
                      ))}
                    </div>
                  </div>

                  {/* Book Button */}
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setSelectedVet(vet);
                      setBookingModal(true);
                    }}
                  >
                    Book Appointment
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking Modal */}
        <Modal
          isOpen={bookingModal}
          onClose={() => setBookingModal(false)}
          title={selectedVet ? `Book with ${selectedVet.name}` : 'Book Appointment'}
          size="md"
          actions={[
            <Button key="cancel" variant="ghost" onClick={() => setBookingModal(false)}>Cancel</Button>,
            <Button key="confirm" variant="primary" onClick={() => {
              setBookingModal(false);
              alert('Appointment booked! Check your email for confirmation.');
              setBookingData({ date: '', time: '', reason: '' });
            }}>Confirm Booking</Button>,
          ]}
        >
          {selectedVet && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">{selectedVet.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedVet.specialty}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={bookingData.date}
                  onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time</label>
                <select
                  value={bookingData.time}
                  onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500"
                >
                  <option value="">Select time</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason for Visit</label>
                <textarea
                  value={bookingData.reason}
                  onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                  placeholder="e.g., Regular checkup, Vaccination, Treatment..."
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500"
                  rows="3"
                />
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Consultation Fee: {selectedVet.consultationFee}
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default VetBookingPage;
