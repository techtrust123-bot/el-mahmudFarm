import { useState } from 'react';
import { FiFilter, FiMapPin, FiDollarSign, FiPhone, FiMail } from 'react-icons/fi';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

/**
 * Marketplace - Buy/Sell animals
 */
const MarketplacePage = () => {
  const [filterBreed, setFilterBreed] = useState('');
  const [filterPrice, setFilterPrice] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [contactModal, setContactModal] = useState(false);

  const listings = [
    {
      id: 1,
      title: 'High Breed Jersey Cows',
      type: 'Livestock',
      breed: 'Jersey',
      price: '$3,500',
      location: 'Central Valley Farm',
      seller: { name: 'Ahmed Hassan', phone: '+234 803 456 7890', email: 'ahmed@farm.com' },
      image: '🐄',
      status: 'approved',
      quantity: '5 heads',
    },
    {
      id: 2,
      title: 'Laying Hens - Rhode Island Red',
      type: 'Poultry',
      breed: 'Rhode Island Red',
      price: '$50 per bird',
      location: 'Northern Poultry Hub',
      seller: { name: 'Nneka Okafor', phone: '+234 701 234 5678', email: 'nneka@poultry.com' },
      image: '🐔',
      status: 'approved',
      quantity: '100 birds',
    },
    {
      id: 3,
      title: 'Brahman Breeding Bulls',
      type: 'Livestock',
      breed: 'Brahman',
      price: '$5,000',
      location: 'South Ranch',
      seller: { name: 'Kofi Mensah', phone: '+234 912 345 6789', email: 'kofi@ranch.com' },
      image: '🐂',
      status: 'pending',
      quantity: '3 heads',
    },
  ];

  const filteredListings = listings.filter(listing => {
    if (filterBreed && listing.breed !== filterBreed) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Buy and sell livestock and poultry</p>
          </div>
          <Button variant="primary" size="lg">+ List Animals</Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Breed</label>
              <select
                value={filterBreed}
                onChange={(e) => setFilterBreed(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
              >
                <option value="">All Breeds</option>
                <option value="Jersey">Jersey</option>
                <option value="Brahman">Brahman</option>
                <option value="Rhode Island Red">Rhode Island Red</option>
              </select>
            </div>
            {(filterBreed) && (
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => setFilterBreed('')}>Clear Filters</Button>
              </div>
            )}
          </div>
        </Card>

        {/* Listings Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <Card key={listing.id} hover shadow="md">
              <div className="space-y-4">
                {/* Image */}
                <div className="text-6xl text-center bg-gray-100 dark:bg-gray-700 py-6 rounded-lg">
                  {listing.image}
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex-1">{listing.title}</h3>
                    <Badge variant={listing.status === 'approved' ? 'success' : 'warning'}>
                      {listing.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{listing.quantity}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <FiMapPin size={16} />
                      <span className="text-sm">{listing.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-lg">
                      <FiDollarSign size={16} />
                      <span>{listing.price}</span>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm mb-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{listing.seller.name}</p>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mt-1">
                      <FiPhone size={14} />
                      <span>{listing.seller.phone}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedListing(listing);
                        setContactModal(true);
                      }}
                      fullWidth
                    >
                      Contact Seller
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Contact Modal */}
        <Modal
          isOpen={contactModal}
          onClose={() => setContactModal(false)}
          title={selectedListing ? `Contact ${selectedListing.seller.name}` : 'Contact Seller'}
          size="md"
          actions={[
            <Button key="cancel" variant="ghost" onClick={() => setContactModal(false)}>Cancel</Button>,
            <Button key="send" variant="primary" onClick={() => {
              setContactModal(false);
              alert('Message sent!');
            }}>Send Message</Button>,
          ]}
        >
          {selectedListing && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">{selectedListing.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedListing.price}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Seller Details:</p>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <FiPhone size={14} /> {selectedListing.seller.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMail size={14} /> {selectedListing.seller.email}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none"
                  rows="4"
                  placeholder="Hi, I'm interested in this listing..."
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
