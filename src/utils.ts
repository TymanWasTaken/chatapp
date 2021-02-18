export const verboseLog = (message: unknown) => {
	import("./options").then(o => {
		if (o.options.verbose) {
			console.log(message)
		}
	})
}