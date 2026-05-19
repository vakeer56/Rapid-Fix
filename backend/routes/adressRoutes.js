const express = require("express");
const { addAddress, getAddress, deleteAddress, getAddressesByUser, updateAddressAddress, updateAddressPinCode, updateAddressDistrict, updateAddressCity, updateAddressArea, updateAddressState } = require("../controllers/addressController");


const router = express.Router();

router.post("/addAddress", addAddress);
router.get("/getAddress/:addressId", getAddress);
router.delete("/deleteAddress/:addressId", deleteAddress);
router.get("/getAddressesByUserId", getAddressesByUser);
router.put("/updateAddressAddress/:addressId", updateAddressAddress);
router.put("/updateAddressPinCode/:addressId", updateAddressPinCode);
router.put("/updateAddressDistrict/:addressId", updateAddressDistrict);
router.put("/updateAddressCity/:addressId", updateAddressCity);
router.put("/updateAddressArea/:addressId", updateAddressArea);
router.put("/updateAddressState/:addressId", updateAddressState);

module.exports = router;