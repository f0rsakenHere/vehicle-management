import { Response } from 'express';
import { VehicleService } from './vehicle.service';
import { AuthRequest } from '../../types/express';

const vehicleService = new VehicleService();

export class VehicleController {
  async createVehicle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { vehicle_name, type, registration_number, daily_rent_price, availability_status } = req.body;

      // Validate required fields
      if (!vehicle_name || !type || !registration_number || !daily_rent_price) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: vehicle_name, type, registration_number, daily_rent_price'
        });
        return;
      }

      const vehicle = await vehicleService.createVehicle(
        vehicle_name,
        type,
        registration_number,
        parseFloat(daily_rent_price),
        availability_status
      );

      res.status(201).json({
        success: true,
        message: 'Vehicle created successfully',
        data: vehicle
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create vehicle'
      });
    }
  }

  async getAllVehicles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicles = await vehicleService.getAllVehicles();

      res.status(200).json({
        success: true,
        message: 'Vehicles retrieved successfully',
        data: vehicles
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve vehicles'
      });
    }
  }

  async getVehicleById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = parseInt(req.params.vehicleId || '0');

      if (isNaN(vehicleId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const vehicle = await vehicleService.getVehicleById(vehicleId);

      res.status(200).json({
        success: true,
        message: 'Vehicle retrieved successfully',
        data: vehicle
      });
    } catch (error: any) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to retrieve vehicle'
      });
    }
  }

  async updateVehicle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = parseInt(req.params.vehicleId || '0');

      if (isNaN(vehicleId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const updateData: any = {};
      if (req.body.vehicle_name !== undefined) updateData.vehicle_name = req.body.vehicle_name;
      if (req.body.type !== undefined) updateData.type = req.body.type;
      if (req.body.registration_number !== undefined) updateData.registration_number = req.body.registration_number;
      if (req.body.daily_rent_price !== undefined) updateData.daily_rent_price = parseFloat(req.body.daily_rent_price);
      if (req.body.availability_status !== undefined) updateData.availability_status = req.body.availability_status;

      const vehicle = await vehicleService.updateVehicle(vehicleId, updateData);

      res.status(200).json({
        success: true,
        message: 'Vehicle updated successfully',
        data: vehicle
      });
    } catch (error: any) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update vehicle'
      });
    }
  }

  async deleteVehicle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const vehicleId = parseInt(req.params.vehicleId || '0');

      if (isNaN(vehicleId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const result = await vehicleService.deleteVehicle(vehicleId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      const statusCode = error.message === 'Vehicle not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete vehicle'
      });
    }
  }
}
