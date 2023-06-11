const { ThermostatService } = require('homebridge-syntex-dynamic-platform');

module.exports = class SynTexThermostatService extends ThermostatService
{
	constructor(homebridgeAccessory, deviceConfig, serviceConfig, manager)
	{
		super(homebridgeAccessory, deviceConfig, serviceConfig, manager);

		this.DeviceManager = manager.DeviceManager;

		this.changeHandler = (state) => {

			this.setToCurrentState(state, () => {

				this.service.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(this.value);
				this.service.getCharacteristic(this.Characteristic.TargetTemperature).updateValue(this.target);
				this.service.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState).updateValue(this.state);
				this.service.getCharacteristic(this.Characteristic.TargetHeatingCoolingState).updateValue(this.mode);
			});
		};
	}

	setTargetTemperature(target, callback)
	{
		this.setToCurrentState({ target }, () => callback());
	}

	setTargetHeatingCoolingState(mode, callback)
	{
		this.setToCurrentState({ mode }, () => callback());
	}

	setToCurrentState(state, callback)
	{
		const setState = (resolve) => {

			this.DeviceManager.fetchRequests(this, { value : this.tempState.value, target : this.tempState.target, state : this.tempState.state, mode : this.tempState.mode }).then((success) => {

				if(success)
				{
					super.setState(this.tempState.value, null, false);
					super.setTargetTemperature(this.tempState.target, null, false);
					super.setCurrentHeatingCoolingState(this.tempState.state, null, false);
					super.setTargetHeatingCoolingState(this.tempState.mode, null, false);

					this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
				}

				if(callback != null)
				{
					callback();
				}

				resolve();

				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, target : this.target, state : this.state, mode : this.mode });
			});
		};

		super.setToCurrentState(state, (resolve) => {

			setState(resolve);

		}, (resolve) => {

			setState(resolve);

		}, (resolve) => {

			var changed = this.changedValue || this.changedState;

			if(changed)
			{
				super.setState(this.tempState.value, null, false);
				super.setCurrentHeatingCoolingState(this.tempState.state, null, false);

				this.logger.log('update', this.id, this.letters, '%update_state[0]% [' + this.name + '] %update_state[1]% [' + this.getStateText() + '] ( ' + this.id + ' )');
			}
			
			if(callback != null)
			{
				callback();
			}

			resolve();

			if(changed)
			{
				this.AutomationSystem.LogikEngine.runAutomation(this, { value : this.value, target : this.target, state : this.state, mode : this.mode });
			}
		});
	}
};