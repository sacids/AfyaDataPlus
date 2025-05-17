


export const loadSurveys = async (setStatus) => {

	const isConnected = await NetworkUtils.isNetworkAvailable()
	if (!isConnected) {
		alert('No internet connection, please ensure you are connected to the internet, before continuing');
		setStatus('No internet connection...')
		return false
	}

	setStatus('Retrieving local forms...')
	let versionInfo = getFormsDefnVersions()
	let current_forms = {}
	for (i = 0; i < versionInfo.length; i++) {
		current_forms[versionInfo[i].form_id] = versionInfo[i]
	}
	setStatus('Checking for Updates...')

	res = await postData('form-defn-meta')
	if (!res) {
		setStatus('Error please report...')
		return
	}
	if (!res.length) {
		setStatus('Nothing to Update...')
	}

	valid_forms = []
	toupdate_forms = {}


	setStatus('Validating update...')

	res.map((item) => {
		// mark form as valid
		valid_forms.push(item.id)

		if (Object.keys(current_forms).includes((item.id).toString())) {
			// compare versions
			if (Number(current_forms[item.id].version) < Number(item.version)) {
				toupdate_forms[item.id] = item
			}
		} else {
			toupdate_forms[item.id] = item
		}
	})

	if (Object.keys(toupdate_forms).length == 0) {

		setStatus('Updating form Permisions')
		//console.log('Updating form Permisions')
		if (!updateFormPerms(valid_forms.join(','))) {
			setStatus('Permisions update FAILED !')
		}
		setStatus('All up to date')
		return
	}

	//console.log('to update forms', toupdate_forms)
	setStatus(Object.keys(toupdate_forms).length + ' Forms to be updated...')

	let insertSuccess = 0
	let insertFailed = 0

	for (const [key, value] of Object.entries(toupdate_forms)) {
		//console.log('Fetching form',value.short_title)

		setStatus('Fetching form ' + value.short_title)

		res = await getData('form-definition/detail/' + key)
		if (res) {
			//console.log('Inserting Form Definition',value.short_title)
			if (insertForm(res)) {
				setStatus('Updating... : Success ' + ++insertSuccess + ' Failed : ' + insertFailed + ' of ' + res.length)
			} else {
				setStatus('Updating... : Success ' + insertSuccess + ' Failed : ' + ++insertFailed + ' of ' + res.length)
			}
		}
	}

	setStatus('Updating form Permisions')
	//console.log('Updating form Permisions')
	if (!updateFormPerms(valid_forms.join(','))) {
		setStatus('Permisions update FAILED !')
	}

	setStatus('Update Complete.  Success ' + insertSuccess + ' Failed : ' + insertFailed + ' of ' + Object.entries(toupdate_forms).length)

}
