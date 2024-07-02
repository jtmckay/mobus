import { observer } from 'mobx-react-lite';
import preactLogo from '../../assets/preact.svg';
import { counterStore, increment } from '../../domain/counter/counter.bus';
import { create, step, syncHeartRate } from '../../domain/pedometer/pedometer.bus';
import { pedometerStore } from '../../domain/pedometer/pedometer.store';
import './style.css';

const TableContents = observer(() => {
	return (<>
		{Array.from(pedometerStore.values()).map(i => {
			return (
				<tr>
					<td>{i.id}</td>
					<td>{i.stepCount}</td>
					<td><div style={{ cursor: 'pointer' }} onClick={() => step({ id: i.id })}>Increment</div></td>
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
					<td><div style={{ cursor: 'pointer' }} onClick={() => syncHeartRate({ id: i.id, rate: Math.round(Math.random() * 100 + 80) })}>Sync</div></td>
				</tr>
			)
		})}
	</>)
})

const Counter = observer(() => (
  <div onClick={() => increment()}>
			Counter: {counterStore.count}
	</div>
));

export function Home() {
	return (
		<div class="home">
			<a href="https://preactjs.com" target="_blank">
				<img src={preactLogo} alt="Preact logo" height="160" width="160" />
			</a>
			<h1>Get Started building Vite-powered Preact Apps</h1>
			<h2>With Mo'Bus</h2>
			<h3>@tanstack/react-query | MobX | RxJS</h3>
			<Counter />
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
					create()
				}}>Add pedometer</div>
			</div>
		</div>
	);
}
