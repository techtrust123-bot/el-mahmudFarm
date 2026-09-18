// const LiveStock = require("../models/liveStock");
// const Poultry = require("../models/poultry");
// const Sells = require("../models/sells");
const mongoose = require('mongoose')

exports.getSaleInventory = async (req, res) => {
    const { LiveStock, Poultry, Egg } = req.farmModels;
    try {
        const [poultry, livestock, eggs] = await Promise.all([
            Poultry.find({ status: 'available' }),
            LiveStock.find({ status: 'available' }),
            Egg.find({ AvailableEggCrates: { $gt: 0 } }),
        ]);

        return res.status(200).json({ success: true, data: { poultry, livestock, eggs } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: 'Unable to load sale inventory.' });
    }
};


exports.recordSales = async (req, res) => {
    const { LiveStock, Poultry,Egg, Sells } = req.farmModels;
    const incoming = Array.isArray(req.body.orders) ? req.body.orders : req.body;
    const orders = Array.isArray(incoming) ? incoming : [incoming];

    if (!orders.length) {
        return res.status(400).json({ success: false, message: 'No order items provided.' });
    }

    // Validate all orders have required fields
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        if (!order.animalType) return res.status(400).json({ success: false, message: `Order ${i + 1}: animalType is required` });
        if (!order.date) return res.status(400).json({ success: false, message: `Order ${i + 1}: date is required` });
        if (!order.customerName) return res.status(400).json({ success: false, message: `Order ${i + 1}: customerName is required` });
        if (!order.buyerContact) return res.status(400).json({ success: false, message: `Order ${i + 1}: buyerContact is required` });
        if (!order.status || !['completed', 'pending'].includes(order.status)) {
            return res.status(400).json({ success: false, message: `Order ${i + 1}: status must be 'completed' or 'pending', got: '${order.status}'` });
        }
    }

    const invoiceGroupId = `INV${Date.now()}`;
    const createdSales = [];

    let session = null;
    const opts = {};
    try {
        if (typeof Sells.db.startSession === 'function') {
            session = await Sells.db.startSession();
            session.startTransaction();
            opts.session = session;
        }
    } catch (sessionError) {
        console.warn('Transactions unavailable, proceeding without session:', sessionError.message);
        session = null;
    }

    const findOne = (model, query) => {
        return session ? model.findOne(query).session(session) : model.findOne(query);
    };

    try {
        for (let index = 0; index < orders.length; index += 1) {
            const order = orders[index];
            const {
                batchId,
                date,
                animalType,
                quantitySold = 1,
                pricePerUnit,
                customerName,
                buyerContact,
                status,
                tagNumber,
                type,
            } = order;

            const quantity = Number(quantitySold) || 1;
            let unitPrice = 0;
            const orderBatchId = batchId;
            let orderTagNumber = tagNumber;
            let costPrice = 0;
            let totalAmount = 0;
            let profit = 0;

            if (animalType === 'Poultry') {
                const poultry = await findOne(Poultry, { batchId, status: 'available' });
                if (!poultry) {
                    throw new Error(`Poultry batch not found for ${batchId}`);
                }
                if (poultry.quantity < quantity) {
                    throw new Error(`Not enough poultry available in batch ${batchId}`);
                }

                unitPrice = Number(poultry.poultrySalePrice || 0);
                if (unitPrice <= 0) {
                    throw new Error(`Poultry batch ${batchId} does not have a valid sale price`);
                }
                costPrice = Number(poultry.costPerPoultry || poultry.purchasePrice || 0);
                totalAmount = quantity * unitPrice;
                profit = (unitPrice - costPrice) * quantity;

                poultry.quantity -= quantity;
                if (poultry.quantity <= 0) {
                    poultry.quantity = 0;
                    poultry.status = 'sold';
                    poultry.totalCost = Number(poultry.purchasePrice || 0);
                }
                await poultry.save(opts);
            } else if (animalType === 'Livestock') {
                let livestock;
                if (tagNumber) {
                    livestock = await findOne(LiveStock, { tagNumber, status: 'available' });
                } else if (type) {
                    livestock = await findOne(LiveStock, { type, status: 'available' });
                    if (livestock) {
                        orderTagNumber = livestock.tagNumber;
                    }
                }

                if (!livestock) {
                    throw new Error('Livestock not found or unavailable.');
                }
                if (livestock.status === 'sold') {
                    throw new Error(`Livestock ${livestock.tagNumber} is already sold.`);
                }
                if (Number(livestock.quantity || 1) < quantity) {
                    throw new Error(`Not enough livestock available for ${livestock.tagNumber}`);
                }

                unitPrice = Number(livestock.livestockSalePrice || 0);
                if (unitPrice <= 0) {
                    throw new Error(`Livestock ${livestock.tagNumber} does not have a valid sale price`);
                }
                const livestockCost = Number(livestock.purchasePrice || livestock.totalCost || 0);
                costPrice = livestockCost;
                totalAmount = unitPrice * quantity;
                profit = (unitPrice - costPrice) * quantity;

                livestock.quantity = Math.max(Number(livestock.quantity || 1) - quantity, 0);
                livestock.status = livestock.quantity > 0 ? 'available' : 'sold';
                livestock.totalCost = Number(livestock.purchasePrice || livestock.totalCost || 0);
                await livestock.save(opts);
            } else if (animalType === 'Egg') {
                const egg = await findOne(Egg, { batchId, AvailableEggCrates: { $gt: 0 } });
                if (!egg) {
                    throw new Error(`Egg batch not found for ${batchId}`);
                }

                const availableCrates = Number(egg.AvailableEggCrates || 0);
                if (availableCrates < quantity) {
                    throw new Error(`Not enough egg crates available in batch ${batchId}`);
                }

                unitPrice = Number(egg.salePricePerCrate || 0);
                if (unitPrice <= 0) {
                    throw new Error(`Egg batch ${batchId} does not have a valid sale price`);
                }
                const crateCost = Number(egg.cratePrice || 0);
                costPrice = crateCost;
                totalAmount = quantity * unitPrice;
                profit = (unitPrice - crateCost) * quantity;

                egg.AvailableEggCrates = availableCrates - quantity;
                egg.totalCrateSold = Math.max(Number(egg.totalCrateSold || 0) + (quantity), 0);
                await egg.save(opts);
            } else {
                throw new Error(`Unsupported animalType: ${animalType}`);
            }

            const invoiceId = `${invoiceGroupId}-${index + 1}`;
            const [saleDoc] = await Sells.create([
                {
                    animalType,
                    batchId: orderBatchId,
                    tagNumber: orderTagNumber,
                    pricePerUnit: unitPrice,
                    costPrice,
                    profit,
                    totalAmount,
                    date,
                    customerName,
                    quantitySold: quantity,
                    status,
                    buyerContact,
                    invoiceId,
                    invoiceGroupId,
                },
            ], opts);

            createdSales.push(saleDoc);
        }

        if (session) {
            await session.commitTransaction();
        }

        return res.status(201).json({ success: true, message: 'Sales recorded successfully.', data: createdSales });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        if (session) {
            session.endSession();
        }
    }
}

exports.getSells = async(req,res)=>{
    const { Sells } = req.farmModels
    try {
        const sells = await Sells.find()
        res.status(200).json({success:true,message:'Sales found...',data:sells})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.getById = async(req,res)=>{
    const { Sells } = req.farmModels;
    const id = req.params.id;
    try {
        const sells = await Sells.findOne({ _id: id });
        if(!sells){
            return res.status(404).json({success:false,message:'Sale not found'})
        }
        res.status(200).json({success:true,message:'Sale found',data:sells})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.edit = async(req,res)=>{
    const { Sells, Poultry, LiveStock, Egg } = req.farmModels;
    const id = req.params.id;
    try {
        const sells = await Sells.findOne({ _id: id });
        if(!sells){
            return res.status(404).json({success:false,message:'Sale not found'})
        }

        const updateData = { ...req.body };
        const quantity = Number(updateData.quantitySold ?? sells.quantitySold ?? 1);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
        }

        let priceRecord;
        if (sells.animalType === 'Poultry') {
            priceRecord = await Poultry.findOne({ batchId: sells.batchId });
        } else if (sells.animalType === 'Livestock') {
            priceRecord = await LiveStock.findOne({ tagNumber: sells.tagNumber });
        } else if (sells.animalType === 'Egg') {
            priceRecord = await Egg.findOne({ batchId: sells.batchId });
        }

        const priceField = sells.animalType === 'Poultry'
            ? 'poultrySalePrice'
            : sells.animalType === 'Livestock' ? 'livestockSalePrice' : 'salePricePerCrate';
        const unitPrice = Number(priceRecord?.[priceField] || 0);
        if (unitPrice <= 0) {
            return res.status(400).json({ success: false, message: 'The selected record does not have a valid sale price' });
        }
        updateData.pricePerUnit = unitPrice;
        const costPrice = Number(sells.costPrice ?? sells.purchasePrice ?? 0);

        if (updateData.pricePerUnit !== undefined || updateData.quantitySold !== undefined) {
            updateData.totalAmount = unitPrice * quantity;
            updateData.profit = (unitPrice - costPrice) * quantity;
        }

        const updateSells = await Sells.findOneAndUpdate({ _id: id }, updateData, { new:true });
        res.status(200).json({success:true,message:'Sale updated successfully',data:updateSells})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const { Sells } = req.farmModels;
    const id = req.params.id;
    if(!id || !mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({success:false,message:'Invalid sale ID'})
    }
    try {
        const sells = await Sells.findOne({ _id: id });
        if(!sells){
            return res.status(404).json({success:false,message:'Sale not found'})
        }
        await Sells.findOneAndDelete({ _id: id });
        res.status(200).json({success:true,message:'Sale deleted successfully'})
    } catch (error) {
           console.log(error)
        res.status(500).json({success:false,message:error.message})
    }
}