import preactLogo from '../../assets/preact.svg';
import './style.css';
import { pedometerStore } from '../../domain/pedometer/pedometer.store';
import { pedometerCommand } from '../../domain/pedometer/pedometer.bus';
import { observer } from 'mobx-react-lite';

const TableContents = observer(() => {
	return (<>
		{Array.from(pedometerStore.values()).map(i => {
			return (
				<tr>
					<td>{i.id}</td>
					<td>{i.stepCount}</td>
					<td><div style={{ cursor: 'pointer' }} onClick={() => pedometerCommand.step({ id: i.id })}>Increment</div></td>
				</tr>
			)
		})}
	</>)
})

const SideThing = observer(() => {
	return (<>
		{Array.from(pedometerStore.values()).map(i => {
			return (
				<tr>
					<td>{i.id}</td>
					<td>{i.heartRate}</td>
					<td><div style={{ cursor: 'pointer' }} onClick={() => pedometerCommand.syncHeartRate({ id: i.id, rate: Math.round(Math.random() * 100 + 80) })}>Sync</div></td>
				</tr>
			)
		})}
	</>)
})

export function Home() {
	return (
		<div class="home">
			<a href="https://preactjs.com" target="_blank">
				<img src={preactLogo} alt="Preact logo" height="160" width="160" />
			</a>
			<h1>Get Started building Vite-powered Preact Apps</h1>
			<h2>With Mobus</h2>
			<h3>@tanstack/react-query | MobX | RxJS</h3>
			<div>
				<table>
					<tbody>
						<tr>
							<td>ID</td>
							<td>Steps</td>
							<td>Track</td>
						</tr>
						<TableContents />
					</tbody>
				</table>
				<table>
					<tbody>
						<tr>
							<td>ID</td>
							<td>Heart Rate</td>
							<td>Track</td>
						</tr>
						<SideThing />
					</tbody>
				</table>
				<div style={{ cursor: 'pointer' }} onClick={() => {
					console.log('create pedometer')
					pedometerCommand.create()
				}}>Add counter</div>
			</div>
		</div>
	);
}
