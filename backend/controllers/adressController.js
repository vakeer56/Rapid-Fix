const { default: mongoose } = require("mongoose");
const address = require("../model/address.model");

const addAddress = async (req, res) => {
    try{
        const {belong_to, address : Address, area, city, district, state, pin_code} = req.body;
        if(!belong_to || !Address || !area || !city || !district || !state || !pin_code){
            return res.status(400).json({message: "All fields are required"});
        }
        const newAddress = new address({
            belong_to,
            address : Address,
            area,
            city,
            district,
            state,
            pin_code
        });
        await newAddress.save();
        return res.status(201).json({message: "Address added successfully", newAddress, addressId: newAddress._id});
    }catch(error){
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const getAddress = async (req, res) => {
    try{
        const {addressId} = req.params;
        if(!addressId){
            return res.status(400).json({message: "Please provide a address id"});
        }
        const addresses = await address.findById(addressId);
        return res.status(200).json({addresses});
    }catch(error){
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        if(!addressId){
            return res.status(400).json({message: "Please provide a address id"});
        }
        await address.findByIdAndDelete(addressId);
        return res.status(200).json({message: "Address deleted successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const getAddressesByUser = async (req, res) => {
    try{
        const {userId} = req.query;
        if(!userId){
            return res.status(400).json({message: "Please provide a user id"});
        }
        const addresses = await address.find({belong_to: userId});
        return res.status(200).json({addresses});
    }catch(error){
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressAddress = async (req, res) => {
    try {
        const { address : Address } = req.body;
        const { addressId } = req.params;
        if(!Address){
            return res.status(400).json({message: "Please provide a address"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {address: Address}});
        return res.status(200).json({message: "Address updated successfully", address});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressPinCode = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { pin_code } = req.body;
        if(!pin_code){
            return res.status(400).json({message: "Please provide a pin code"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {pin_code: pin_code}});
        return res.status(200).json({message: "Pin code updated successfully", pin_code});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressDistrict = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { district } = req.body;
        if(!district){
            return res.status(400).json({message: "Please provide a district"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {district: district}});
        return res.status(200).json({message: "District updated successfully", district});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressCity = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { city } = req.body;
        if(!city){
            return res.status(400).json({message: "Please provide a city"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {city: city}});
        return res.status(200).json({message: "City updated successfully", city});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressArea = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { area } = req.body;
        if(!area){
            return res.status(400).json({message: "Please provide a area"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {area: area}});
        return res.status(200).json({message: "Area updated successfully", area});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

const updateAddressState = async (req, res) => {
    try {
        const { addressId } = req.params;
        const { state } = req.body;
        if(!state){
            return res.status(400).json({message: "Please provide a state"});
        }
        await address.findByIdAndUpdate(addressId, {$set: {state: state}});
        return res.status(200).json({message: "State updated successfully", state});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

module.exports = {addAddress, getAddress, deleteAddress, getAddressesByUser, updateAddressAddress, updateAddressPinCode, updateAddressDistrict, updateAddressCity, updateAddressArea, updateAddressState};